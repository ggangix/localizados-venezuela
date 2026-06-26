import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { Localizado } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localizadosvenezuela.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/buscar`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/lugares`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/contribuir`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/api`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    await connectDB();
    const [lugares, localizados] = await Promise.all([
      Lugar.find().select("slug updatedAt").lean(),
      Localizado.find({ estado: "published" })
        .select("slug updatedAt")
        .limit(5000)
        .lean(),
    ]);

    return [
      ...staticRoutes,
      ...lugares.map((l) => ({
        url: `${siteUrl}/lugares/${l.slug}`,
        lastModified: l.updatedAt ?? new Date(),
        changeFrequency: "hourly" as const,
        priority: 0.8,
      })),
      ...localizados.map((l) => ({
        url: `${siteUrl}/localizados/${l.slug}`,
        lastModified: l.updatedAt ?? new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
