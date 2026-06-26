import { createHash, randomBytes } from "crypto";
import { BirdClient } from "@messagebird/sdk";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Localizado, normalizeNombre } from "@/lib/models/Localizado";
import {
  NotificationDelivery,
  type NotificationDeliveryDoc,
} from "@/lib/models/NotificationDelivery";
import {
  LocalizadoChangeEvent,
  type LocalizadoChangeEventDoc,
  type LocalizadoChangeEventType,
  type LocalizadoChangeSource,
} from "@/lib/models/LocalizadoChangeEvent";
import {
  NOTIFICATION_CHANNELS,
  NotificationSubscription,
  type NotificationChannel,
} from "@/lib/models/NotificationSubscription";
import {
  SavedSearchSubscription,
  type SavedSearchSubscriptionDoc,
} from "@/lib/models/SavedSearchSubscription";
import { absoluteUrl } from "@/lib/share";

const PUBLIC_NOTIFY_FIELDS = new Set([
  "nombreCompleto",
  "edad",
  "cedula",
  "telefono",
  "direccion",
  "observaciones",
  "condicion",
  "lugarId",
  "estado",
  "deletedAt",
]);

export type LocalizadoNotificationSnapshot = {
  id: string;
  slug: string;
  nombreCompleto: string;
  nombreNormalizado?: string;
  estado?: string;
  lugarId?: string;
  deletedAt?: Date | string | null;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  condicion?: string;
};

type SubscribeInput = {
  slug: string;
  channel: NotificationChannel;
  destination: string;
  ipHash?: string;
};

type SavedSearchSubscribeInput = {
  queryName: string;
  cedula?: string;
  age?: string;
  channel: NotificationChannel;
  destination: string;
  ipHash?: string;
};

type SubscriptionKind = "localizado" | "saved_search";

export function isNotificationChannel(channel: string): channel is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(channel);
}

export function hashNotificationValue(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function token() {
  return randomBytes(32).toString("base64url");
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function notificationSecret() {
  return process.env.NOTIFICATION_SECRET || process.env.ADMIN_SECRET || "local-dev";
}

function unsubscribeToken(
  subscriptionId: unknown,
  kind: SubscriptionKind = "localizado"
) {
  const id = String(subscriptionId);
  const body = kind === "localizado" ? id : `${kind}:${id}`;
  const sig = createHash("sha256")
    .update(`${body}:${notificationSecret()}`)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyUnsubscribeToken(rawToken: string) {
  const [body, sig] = rawToken.split(".");
  if (!body || !sig) return null;
  const expected = createHash("sha256")
    .update(`${body}:${notificationSecret()}`)
    .digest("base64url");
  if (expected !== sig) return null;

  const [maybeKind, id] = body.split(":");
  if (maybeKind === "saved_search" && id) {
    return { kind: "saved_search" as const, id };
  }
  return { kind: "localizado" as const, id: body };
}

function normalizeDestination(channel: NotificationChannel, destination: string) {
  const trimmed = destination.trim();
  if (channel === "email") return trimmed.toLowerCase();
  return trimmed.replace(/\s+/g, "");
}

function validateDestination(channel: NotificationChannel, destination: string) {
  if (channel === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination);
  }
  return /^\+?[0-9]{8,15}$/.test(destination);
}

export function normalizeNotificationCedula(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || undefined;
}

function isVisible(snapshot: LocalizadoNotificationSnapshot) {
  return snapshot.estado === "published" && !snapshot.deletedAt;
}

export function snapshotLocalizado(doc: {
  _id: unknown;
  slug: string;
  nombreCompleto: string;
  nombreNormalizado?: string | null;
  estado?: string;
  lugarId?: unknown;
  deletedAt?: Date | string | null;
  edad?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  condicion?: string | null;
}): LocalizadoNotificationSnapshot {
  return {
    id: String(doc._id),
    slug: doc.slug,
    nombreCompleto: doc.nombreCompleto,
    nombreNormalizado: doc.nombreNormalizado ?? undefined,
    estado: doc.estado,
    lugarId: doc.lugarId ? String(doc.lugarId) : undefined,
    deletedAt: doc.deletedAt ?? null,
    edad: doc.edad ?? undefined,
    cedula: doc.cedula ?? undefined,
    telefono: doc.telefono ?? undefined,
    direccion: doc.direccion ?? undefined,
    observaciones: doc.observaciones ?? undefined,
    condicion: doc.condicion ?? undefined,
  };
}

function changedFields(
  before: LocalizadoNotificationSnapshot,
  after: LocalizadoNotificationSnapshot
) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields].filter((field) => {
    if (!PUBLIC_NOTIFY_FIELDS.has(field)) return false;
    const key = field as keyof LocalizadoNotificationSnapshot;
    return String(before[key] ?? "") !== String(after[key] ?? "");
  });
}

function eventType(
  before: LocalizadoNotificationSnapshot,
  after: LocalizadoNotificationSnapshot
): LocalizadoChangeEventType {
  if (before.deletedAt && isVisible(after)) return "restored";
  if (!isVisible(before) && isVisible(after)) return "published";
  if (isVisible(before) && after.deletedAt) return "soft_deleted";
  if (isVisible(before) && after.estado === "rejected") return "rejected";
  if (before.lugarId !== after.lugarId) return "moved";
  return "updated";
}

function eventSummary(
  type: LocalizadoChangeEventType,
  after: LocalizadoNotificationSnapshot,
  fields: string[]
) {
  if (type === "soft_deleted" || type === "rejected") {
    return `El registro de ${after.nombreCompleto} ya no está publicado.`;
  }
  if (type === "published" || type === "restored") {
    return `El registro de ${after.nombreCompleto} fue publicado o restaurado.`;
  }
  if (type === "moved") {
    return `El registro de ${after.nombreCompleto} cambió de lugar.`;
  }
  const fieldText = fields.length ? ` Campos actualizados: ${fields.join(", ")}.` : "";
  return `El registro de ${after.nombreCompleto} fue actualizado.${fieldText}`;
}

async function markDelivery(
  delivery: NotificationDeliveryDoc,
  status: "sent" | "failed" | "skipped",
  attrs: Partial<
    Pick<NotificationDeliveryDoc, "provider" | "providerMessageId" | "error">
  >
) {
  await NotificationDelivery.updateOne(
    { _id: delivery._id },
    {
      $set: {
        status,
        provider: attrs.provider,
        providerMessageId: attrs.providerMessageId,
        error: attrs.error,
        ...(status === "sent" ? { sentAt: new Date() } : {}),
      },
    }
  );
  return status;
}

async function deliver(delivery: NotificationDeliveryDoc, destination: string) {
  const provider = process.env.NOTIFICATION_PROVIDER ?? "local-dev";

  if (provider === "local-dev") {
    const status = await markDelivery(delivery, "sent", {
      provider: "local-dev",
      providerMessageId: `local_${String(delivery._id)}`,
    });
    console.info("[local notification]", {
      channel: delivery.channel,
      kind: delivery.kind,
      destinationHash: delivery.destinationHash,
      subject: delivery.payload?.subject,
    });
    return status;
  }

  if (provider === "bird" && delivery.channel === "email") {
    try {
      const messageId = await sendBirdEmail({
        subject: delivery.payload?.subject ?? "Actualización",
        text: delivery.payload?.text ?? "",
        url: delivery.payload?.url ?? undefined,
        unsubscribeUrl: delivery.payload?.unsubscribeUrl ?? undefined,
        destination,
      });
      return markDelivery(delivery, "sent", {
        provider: "bird",
        providerMessageId: messageId,
      });
    } catch (err) {
      return markDelivery(delivery, "failed", {
        provider: "bird",
        error: err instanceof Error ? err.message : "Bird delivery failed",
      });
    }
  }

  return markDelivery(delivery, "skipped", {
    provider,
    error: `No provider adapter configured for ${delivery.channel}`,
  });
}

function birdApiBase() {
  const configured = process.env.BIRD_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "";
}

async function sendBirdEmail(input: {
  destination: string;
  subject: string;
  text: string;
  url?: string;
  unsubscribeUrl?: string;
}) {
  const apiKey = process.env.BIRD_API_KEY;
  const from = process.env.BIRD_EMAIL_FROM?.trim();
  if (!apiKey) throw new Error("BIRD_API_KEY no configurado");
  if (!from) throw new Error("BIRD_EMAIL_FROM no configurado");
  if (!input.destination) throw new Error("Destino de email no encontrado");

  const text = [input.text, input.url, input.unsubscribeUrl]
    .filter(Boolean)
    .join("\n\n");
  const html = `<p>${escapeHtml(input.text)}</p>${
    input.url ? `<p><a href="${escapeHtml(input.url)}">Ver registro</a></p>` : ""
  }${
    input.unsubscribeUrl
      ? `<p><a href="${escapeHtml(input.unsubscribeUrl)}">Cancelar suscripción</a></p>`
      : ""
  }`;

  const bird = new BirdClient({
    apiKey,
    ...(birdApiBase() ? { baseUrl: birdApiBase() } : {}),
    maxRetries: 0,
  });
  const message = await bird.email.send(
    {
      from,
      to: [input.destination],
      subject: input.subject,
      text,
      html,
      category: "transactional",
      metadata: {
        app: "localizados-venezuela",
        notification_url: input.url,
      },
    },
    {
      idempotencyKey: hashNotificationValue(
        `${input.destination}:${input.subject}:${input.text}:${input.url ?? ""}`
      ),
    }
  );
  return message.id ?? "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function dispatchDeliveryLater(delivery: NotificationDeliveryDoc, destination: string) {
  setTimeout(() => {
    void deliver(delivery, destination).catch((err) => {
      console.error("[notification delivery failed]", {
        deliveryId: String(delivery._id),
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, 0);
}

async function createDelivery(input: {
  subscriptionId?: mongoose.Types.ObjectId;
  savedSearchSubscriptionId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  channel: NotificationChannel;
  destination: string;
  destinationHash: string;
  kind: "confirmation" | "event";
  subject: string;
  text: string;
  url: string;
  unsubscribeUrl?: string;
  dispatch?: "inline" | "async";
}) {
  const delivery = await NotificationDelivery.create({
    subscriptionId: input.subscriptionId,
    savedSearchSubscriptionId: input.savedSearchSubscriptionId,
    eventId: input.eventId,
    channel: input.channel,
    destinationHash: input.destinationHash,
    kind: input.kind,
    payload: {
      subject: input.subject,
      text: input.text,
      url: input.url,
      unsubscribeUrl: input.unsubscribeUrl,
    },
  });
  if (input.dispatch === "async") {
    dispatchDeliveryLater(delivery, input.destination);
    return { delivery, status: "pending" as const };
  }
  const status = await deliver(delivery, input.destination);
  return { delivery, status };
}

function eventNotificationStatus(
  deliveries: Array<{ status: NotificationDeliveryDoc["status"] | "pending" }>
) {
  if (deliveries.length === 0) return "skipped" as const;
  return deliveries.some((delivery) => delivery.status === "failed")
    ? ("failed" as const)
    : ("processed" as const);
}

function notificationKey(snapshot: LocalizadoNotificationSnapshot) {
  const raw = [snapshot.nombreNormalizado ?? snapshot.nombreCompleto, snapshot.cedula]
    .filter(Boolean)
    .join(":");
  return hashNotificationValue(raw);
}

export async function subscribeToLocalizado(input: SubscribeInput) {
  await connectDB();
  const destination = normalizeDestination(input.channel, input.destination);
  if (!validateDestination(input.channel, destination)) {
    throw new Error("Destino de notificación inválido");
  }

  const localizado = await Localizado.findOne({
    slug: input.slug,
    estado: "published",
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }).select("_id slug nombreCompleto");
  if (!localizado) throw new Error("Localizado no encontrado");

  const confirmationToken = token();
  const destinationHash = hashNotificationValue(`${input.channel}:${destination}`);

  let subscription = await NotificationSubscription.findOne({
    localizadoId: localizado._id,
    channel: input.channel,
    destinationHash,
    status: { $in: ["pending", "active"] },
  });

  if (subscription?.status === "active") {
    return {
      id: String(subscription._id),
      status: subscription.status,
      confirmationToken: undefined,
    };
  }

  if (subscription) {
    subscription.confirmationTokenHash = tokenHash(confirmationToken);
    subscription.consentedAt = new Date();
    subscription.ipHash = input.ipHash;
    await subscription.save();
  } else {
    subscription = await NotificationSubscription.create({
      localizadoId: localizado._id,
      channel: input.channel,
      destination,
      destinationHash,
      consentedAt: new Date(),
      confirmationTokenHash: tokenHash(confirmationToken),
      ipHash: input.ipHash,
    });
  }

  const confirmation = await createDelivery({
    subscriptionId: subscription._id,
    channel: input.channel,
    destination,
    destinationHash,
    kind: "confirmation",
    subject: "Confirma tu suscripción",
    text: `Confirma que quieres recibir avisos cuando se actualice el registro de ${localizado.nombreCompleto}.`,
    url: absoluteUrl(
      `/api/v1/notification-subscriptions/confirm?token=${confirmationToken}`
    ),
  });
  if (confirmation.status !== "sent") {
    throw new Error("No se pudo enviar la confirmación de suscripción");
  }

  return {
    id: String(subscription._id),
    status: subscription.status,
    confirmationToken:
      process.env.NODE_ENV === "production" ? undefined : confirmationToken,
  };
}

export async function subscribeToSavedSearch(input: SavedSearchSubscribeInput) {
  await connectDB();
  const destination = normalizeDestination(input.channel, input.destination);
  if (!validateDestination(input.channel, destination)) {
    throw new Error("Destino de notificación inválido");
  }

  const queryName = input.queryName.trim().replace(/\s+/g, " ");
  if (queryName.length < 2) {
    throw new Error("Nombre buscado requerido");
  }

  const cedula = normalizeNotificationCedula(input.cedula);
  if (input.cedula?.trim() && !cedula) {
    throw new Error("Cédula inválida");
  }

  const age = input.age?.trim();
  if (age && !/^\d{1,3}$/.test(age)) {
    throw new Error("Edad inválida");
  }

  const confirmationToken = token();
  const queryNameNormalized = normalizeNombre(queryName);
  const cedulaHash = cedula ? hashNotificationValue(cedula) : undefined;
  const destinationHash = hashNotificationValue(`${input.channel}:${destination}`);

  let subscription = await SavedSearchSubscription.findOne({
    channel: input.channel,
    destinationHash,
    queryNameNormalized,
    ...(cedulaHash ? { cedulaHash } : { cedulaHash: { $exists: false } }),
    status: { $in: ["pending", "active"] },
  });

  if (subscription?.status === "active") {
    return {
      id: String(subscription._id),
      status: subscription.status,
      confirmationToken: undefined,
    };
  }

  if (subscription) {
    subscription.queryName = queryName;
    subscription.age = age || undefined;
    subscription.confirmationTokenHash = tokenHash(confirmationToken);
    subscription.consentedAt = new Date();
    subscription.ipHash = input.ipHash;
    await subscription.save();
  } else {
    subscription = await SavedSearchSubscription.create({
      queryName,
      queryNameNormalized,
      cedulaHash,
      age: age || undefined,
      channel: input.channel,
      destination,
      destinationHash,
      consentedAt: new Date(),
      confirmationTokenHash: tokenHash(confirmationToken),
      ipHash: input.ipHash,
    });
  }

  const confirmation = await createDelivery({
    savedSearchSubscriptionId: subscription._id,
    channel: input.channel,
    destination,
    destinationHash,
    kind: "confirmation",
    subject: "Confirma tu aviso de busqueda",
    text: `Confirma que quieres recibir avisos si se publica un registro verificado que podria coincidir con tu busqueda por "${queryName}".`,
    url: absoluteUrl(
      `/api/v1/notification-subscriptions/confirm?token=${confirmationToken}`
    ),
  });
  if (confirmation.status !== "sent") {
    throw new Error("No se pudo enviar la confirmación de suscripción");
  }

  return {
    id: String(subscription._id),
    status: subscription.status,
    confirmationToken:
      process.env.NODE_ENV === "production" ? undefined : confirmationToken,
  };
}

export async function confirmNotificationSubscription(rawToken: string) {
  await connectDB();
  const subscription = await NotificationSubscription.findOne({
    confirmationTokenHash: tokenHash(rawToken),
    status: "pending",
  });
  if (subscription) {
    subscription.status = "active";
    subscription.confirmedAt = new Date();
    await subscription.save();
    return { id: String(subscription._id) };
  }

  const savedSearchSubscription = await SavedSearchSubscription.findOne({
    confirmationTokenHash: tokenHash(rawToken),
    status: "pending",
  });
  if (!savedSearchSubscription) throw new Error("Suscripción no encontrada");

  savedSearchSubscription.status = "active";
  savedSearchSubscription.confirmedAt = new Date();
  await savedSearchSubscription.save();
  return { id: String(savedSearchSubscription._id) };
}

export async function unsubscribeFromNotifications(rawToken: string) {
  await connectDB();
  const target = verifyUnsubscribeToken(rawToken);
  if (!target) throw new Error("Suscripción no encontrada");
  const subscription =
    target.kind === "saved_search"
      ? await SavedSearchSubscription.findOne({
          _id: target.id,
          status: { $ne: "unsubscribed" },
        })
      : await NotificationSubscription.findOne({
          _id: target.id,
          status: { $ne: "unsubscribed" },
        });
  if (!subscription) throw new Error("Suscripción no encontrada");

  subscription.status = "unsubscribed";
  subscription.unsubscribedAt = new Date();
  await subscription.save();
  return { id: String(subscription._id) };
}

function savedSearchMatchBranches(snapshot: LocalizadoNotificationSnapshot) {
  const nameNormalized =
    snapshot.nombreNormalizado ?? normalizeNombre(snapshot.nombreCompleto);
  const cedula = normalizeNotificationCedula(snapshot.cedula);
  const branches: Record<string, unknown>[] = [{ queryNameNormalized: nameNormalized }];

  if (cedula) {
    branches.unshift({ cedulaHash: hashNotificationValue(cedula) });
  }

  return branches;
}

async function createSavedSearchEventDelivery(input: {
  eventId: mongoose.Types.ObjectId;
  subscription: SavedSearchSubscriptionDoc;
  snapshot: LocalizadoNotificationSnapshot;
}) {
  const existing = await NotificationDelivery.exists({
    eventId: input.eventId,
    savedSearchSubscriptionId: input.subscription._id,
    kind: "event",
  });
  if (existing) return null;

  return createDelivery({
    savedSearchSubscriptionId: input.subscription._id,
    eventId: input.eventId,
    channel: input.subscription.channel,
    destination: input.subscription.destination,
    destinationHash: input.subscription.destinationHash,
    kind: "event",
    subject: "Posible coincidencia publicada",
    text: `Aparecio un registro publicado que podria coincidir con tu busqueda por "${input.subscription.queryName}". Verifica la informacion en la pagina del registro.`,
    url: absoluteUrl(`/localizados/${input.snapshot.slug}`),
    unsubscribeUrl: absoluteUrl(
      `/api/v1/notification-subscriptions/unsubscribe?token=${unsubscribeToken(
        input.subscription._id,
        "saved_search"
      )}`
    ),
    dispatch: "async",
  });
}

async function notifySavedSearchMatches(
  event: LocalizadoChangeEventDoc,
  snapshot: LocalizadoNotificationSnapshot
) {
  if (event.eventType !== "published" || !isVisible(snapshot)) return [];

  const matchBranches = savedSearchMatchBranches(snapshot);
  if (matchBranches.length === 0) return [];

  const eventCreatedAt = event.createdAt ?? new Date();
  const subscriptions = await SavedSearchSubscription.find({
    status: "active",
    confirmedAt: { $lte: eventCreatedAt },
    $or: matchBranches,
  });

  const deliveries = await Promise.all(
    subscriptions.map((subscription) =>
      createSavedSearchEventDelivery({
        eventId: event._id,
        subscription,
        snapshot,
      })
    )
  );

  return deliveries.filter((delivery) => delivery !== null);
}

export async function notifyLocalizadoChanged(input: {
  before: LocalizadoNotificationSnapshot;
  after: LocalizadoNotificationSnapshot;
  actor?: string;
  source?: LocalizadoChangeSource;
  contributionId?: string;
  importRunId?: string;
}) {
  const fields = changedFields(input.before, input.after);
  if (fields.length === 0) return null;
  if (!isVisible(input.before) && !isVisible(input.after)) return null;

  await connectDB();
  const type = eventType(input.before, input.after);
  const event = await LocalizadoChangeEvent.create({
    entityId: input.after.id,
    slugSnapshot: input.after.slug,
    eventType: type,
    source: input.source ?? "admin",
    actor: { type: input.actor ? "admin" : "system", id: input.actor },
    importRunId: input.importRunId,
    contributionId: input.contributionId,
    lugarIdBefore: input.before.lugarId,
    lugarIdAfter: input.after.lugarId,
    estadoBefore: input.before.estado,
    estadoAfter: input.after.estado,
    changedFields: fields,
    notificationKey: notificationKey(input.after),
    personSnapshot: {
      nombreCompleto: input.after.nombreCompleto,
      nombreNormalizado: input.after.nombreNormalizado,
      slug: input.after.slug,
      lugarId: input.after.lugarId,
      estado: input.after.estado,
      condicion: input.after.condicion,
      edad: input.after.edad,
    },
  });

  const subscriptions = await NotificationSubscription.find({
    localizadoId: event.entityId,
    status: "active",
  });

  const url = absoluteUrl(`/localizados/${input.after.slug}`);
  const summary = eventSummary(type, input.after, fields);
  const deliveries = await Promise.all(
    subscriptions.map((subscription) =>
      createDelivery({
        subscriptionId: subscription._id,
        eventId: event._id,
        channel: subscription.channel,
        destination: subscription.destination,
        destinationHash: subscription.destinationHash,
        kind: "event",
        subject: "Registro actualizado",
        text: `${summary} Revisa el registro público para ver la información verificada.`,
        url,
        unsubscribeUrl: absoluteUrl(
          `/api/v1/notification-subscriptions/unsubscribe?token=${unsubscribeToken(
            subscription._id
          )}`
        ),
        dispatch: "async",
      })
    )
  );
  const savedSearchDeliveries = await notifySavedSearchMatches(event, input.after);
  const allDeliveries = [...deliveries, ...savedSearchDeliveries];

  event.processedForNotificationsAt = new Date();
  event.notificationStatus = eventNotificationStatus(allDeliveries);
  await event.save();

  return {
    eventId: String(event._id),
    deliveries: allDeliveries.length,
  };
}

export async function notifyLocalizadoCreated(input: {
  localizadoId: string;
  actor?: string;
  source?: LocalizadoChangeSource;
  contributionId?: string;
  importRunId?: string;
}) {
  await connectDB();
  const doc = await Localizado.findById(input.localizadoId);
  if (!doc) return null;
  const snapshot = snapshotLocalizado(doc);
  if (!isVisible(snapshot)) return null;

  const event = await LocalizadoChangeEvent.create({
    entityId: snapshot.id,
    slugSnapshot: snapshot.slug,
    eventType: "published",
    source: input.source ?? "admin",
    actor: { type: input.actor ? "admin" : "system", id: input.actor },
    contributionId: input.contributionId,
    importRunId: input.importRunId,
    changedFields: ["estado"],
    notificationKey: notificationKey(snapshot),
    personSnapshot: {
      nombreCompleto: snapshot.nombreCompleto,
      nombreNormalizado: snapshot.nombreNormalizado,
      slug: snapshot.slug,
      lugarId: snapshot.lugarId,
      estado: snapshot.estado,
      condicion: snapshot.condicion,
      edad: snapshot.edad,
    },
  });
  const deliveries = await notifySavedSearchMatches(event, snapshot);
  event.processedForNotificationsAt = new Date();
  event.notificationStatus = eventNotificationStatus(deliveries);
  await event.save();
  return event;
}

export async function recordPublishedLocalizadoEvents(
  docs: Array<{
    _id: unknown;
    slug: string;
    nombreCompleto: string;
    nombreNormalizado?: string | null;
    estado?: string;
    lugarId?: unknown;
    deletedAt?: Date | string | null;
    edad?: string | null;
    cedula?: string | null;
    condicion?: string | null;
  }>,
  opts: {
    source: LocalizadoChangeSource;
    importRunId?: string;
    actor?: { type: "admin" | "script" | "system"; id?: string };
    notifySavedSearches?: boolean;
  }
) {
  const snapshots = docs.flatMap((doc) => {
    const snapshot = snapshotLocalizado(doc);
    if (!isVisible(snapshot)) return [];
    return [snapshot];
  });
  const events = snapshots.map((snapshot) => ({
    entityId: snapshot.id,
    slugSnapshot: snapshot.slug,
    eventType: "published" as const,
    source: opts.source,
    actor: opts.actor ?? { type: "script" as const },
    importRunId: opts.importRunId,
    estadoAfter: snapshot.estado,
    changedFields: ["estado"],
    notificationKey: notificationKey(snapshot),
    personSnapshot: {
      nombreCompleto: snapshot.nombreCompleto,
      nombreNormalizado: snapshot.nombreNormalizado,
      slug: snapshot.slug,
      lugarId: snapshot.lugarId,
      estado: snapshot.estado,
      condicion: snapshot.condicion,
      edad: snapshot.edad,
    },
  }));

  if (events.length === 0) return 0;
  const inserted = await LocalizadoChangeEvent.insertMany(events, { ordered: false });
  if (opts.notifySavedSearches === false) {
    await LocalizadoChangeEvent.updateMany(
      { _id: { $in: inserted.map((event) => event._id) } },
      {
        $set: {
          processedForNotificationsAt: new Date(),
          notificationStatus: "skipped",
        },
      }
    );
    return events.length;
  }
  await Promise.all(
    inserted.map(async (event, index) => {
      const deliveries = await notifySavedSearchMatches(event, snapshots[index]);
      event.processedForNotificationsAt = new Date();
      event.notificationStatus = eventNotificationStatus(deliveries);
      await event.save();
    })
  );
  return events.length;
}
