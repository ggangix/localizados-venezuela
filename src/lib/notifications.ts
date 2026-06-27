import { createHash } from "crypto";
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
import {
  parseWebPushSubscription,
  sendWebPush,
  vapidConfigured,
  webpushEndpoint,
} from "@/lib/webpush";

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
  // webpush: el destino es el JSON de la PushSubscription, se conserva tal cual.
  if (channel === "webpush") return destination.trim();
  return destination.trim();
}

function validateDestination(channel: NotificationChannel, destination: string) {
  if (channel === "webpush") {
    return parseWebPushSubscription(destination) !== null;
  }
  return false;
}

// Deduplica por endpoint (identidad estable del dispositivo), no por el JSON
// completo, cuyas claves pueden rotar.
function destinationHashFor(channel: NotificationChannel, destination: string) {
  if (channel === "webpush") {
    const endpoint = webpushEndpoint(destination);
    return hashNotificationValue(`webpush:${endpoint ?? destination}`);
  }
  return hashNotificationValue(`${channel}:${destination}`);
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

async function deactivateExpiredWebpush(delivery: NotificationDeliveryDoc) {
  if (delivery.subscriptionId) {
    await NotificationSubscription.updateOne(
      { _id: delivery.subscriptionId, status: { $ne: "unsubscribed" } },
      { $set: { status: "unsubscribed", unsubscribedAt: new Date() } }
    );
  }
  if (delivery.savedSearchSubscriptionId) {
    await SavedSearchSubscription.updateOne(
      { _id: delivery.savedSearchSubscriptionId, status: { $ne: "unsubscribed" } },
      { $set: { status: "unsubscribed", unsubscribedAt: new Date() } }
    );
  }
}

async function deliver(delivery: NotificationDeliveryDoc, destination: string) {
  // Con claves VAPID se envía el push real; sin ellas (desarrollo) solo se registra.
  if (vapidConfigured()) {
    const result = await sendWebPush(destination, {
      title: delivery.payload?.subject ?? "Localizados Venezuela",
      body: delivery.payload?.text ?? "",
      url: delivery.payload?.url ?? undefined,
    });
    if (result.status === "sent") {
      return markDelivery(delivery, "sent", {
        provider: "webpush",
        providerMessageId: result.id,
      });
    }
    if (result.status === "expired") {
      // Solo damos de baja la suscripción si falla un evento REAL hacia un
      // endpoint muerto. El push de bienvenida es best-effort.
      if (delivery.kind === "event") {
        await deactivateExpiredWebpush(delivery);
      }
      return markDelivery(delivery, "failed", {
        provider: "webpush",
        error: "Suscripción webpush expirada",
      });
    }
    return markDelivery(delivery, "failed", {
      provider: "webpush",
      error: result.error,
    });
  }

  const status = await markDelivery(delivery, "sent", {
    provider: "local-dev",
    providerMessageId: `local_${String(delivery._id)}`,
  });
  console.info("[webpush local-dev]", {
    kind: delivery.kind,
    destinationHash: delivery.destinationHash,
    subject: delivery.payload?.subject,
  });
  return status;
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

/**
 * webpush no necesita doble opt-in (el permiso del navegador ya es consentimiento):
 * la suscripción queda activa de inmediato y enviamos un push de bienvenida que
 * además verifica que el canal funciona. Es best-effort: no bloquea ni lanza.
 */
async function welcomePushDelivery(input: {
  subscriptionId?: mongoose.Types.ObjectId;
  savedSearchSubscriptionId?: mongoose.Types.ObjectId;
  channel: NotificationChannel;
  destination: string;
  destinationHash: string;
  text: string;
}) {
  return createDelivery({
    subscriptionId: input.subscriptionId,
    savedSearchSubscriptionId: input.savedSearchSubscriptionId,
    channel: input.channel,
    destination: input.destination,
    destinationHash: input.destinationHash,
    kind: "confirmation",
    subject: "Avisos activados",
    text: input.text,
    url: absoluteUrl("/"),
    dispatch: "async",
  });
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
    throw new Error("Suscripción push inválida");
  }

  const localizado = await Localizado.findOne({
    slug: input.slug,
    estado: "published",
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }).select("_id slug nombreCompleto");
  if (!localizado) throw new Error("Localizado no encontrado");

  const destinationHash = destinationHashFor(input.channel, destination);

  let subscription = await NotificationSubscription.findOne({
    localizadoId: localizado._id,
    channel: input.channel,
    destinationHash,
    status: "active",
  });

  if (subscription) {
    subscription.destination = destination;
    subscription.consentedAt = new Date();
    subscription.ipHash = input.ipHash;
    await subscription.save();
  } else {
    subscription = await NotificationSubscription.create({
      localizadoId: localizado._id,
      channel: input.channel,
      destination,
      destinationHash,
      status: "active",
      consentedAt: new Date(),
      ipHash: input.ipHash,
    });
  }

  await welcomePushDelivery({
    subscriptionId: subscription._id,
    channel: input.channel,
    destination,
    destinationHash,
    text: `Avisos activados para el registro de ${localizado.nombreCompleto}.`,
  });

  return { id: String(subscription._id), status: "active" as const };
}

export async function subscribeToSavedSearch(input: SavedSearchSubscribeInput) {
  await connectDB();
  const destination = normalizeDestination(input.channel, input.destination);
  if (!validateDestination(input.channel, destination)) {
    throw new Error("Suscripción push inválida");
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

  const queryNameNormalized = normalizeNombre(queryName);
  const cedulaHash = cedula ? hashNotificationValue(cedula) : undefined;
  const destinationHash = destinationHashFor(input.channel, destination);

  let subscription = await SavedSearchSubscription.findOne({
    channel: input.channel,
    destinationHash,
    queryNameNormalized,
    ...(cedulaHash ? { cedulaHash } : { cedulaHash: { $exists: false } }),
    status: "active",
  });

  if (subscription) {
    subscription.queryName = queryName;
    subscription.age = age || undefined;
    subscription.destination = destination;
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
      status: "active",
      consentedAt: new Date(),
      ipHash: input.ipHash,
    });
  }

  await welcomePushDelivery({
    savedSearchSubscriptionId: subscription._id,
    channel: input.channel,
    destination,
    destinationHash,
    text: `Aviso activado en este dispositivo para "${queryName}".`,
  });

  return { id: String(subscription._id), status: "active" as const };
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
    consentedAt: { $lte: eventCreatedAt },
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
