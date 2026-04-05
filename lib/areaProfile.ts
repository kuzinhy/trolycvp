export interface AreaProfile {
  ward: string;
  district_or_city: string;
  province_or_city: string;
  aliases: string[];
  institutions: string[];
  landmarks: string[];
  roads: string[];
}

export function buildAreaProfile(area: any): AreaProfile {
  const { ward, district_or_city, province_or_city } = area;
  
  const aliases = [
    ward,
    ward.replace(/Phường |Xã /g, ""),
    `UBND ${ward}`,
    `Công an ${ward}`,
    `Đảng ủy ${ward}`
  ].filter(Boolean);

  // In a real app, these would be fetched from a database or OSM tags
  // For now, we provide some generic placeholders or infer from address
  const institutions = [
    `UBND ${ward}`,
    `Công an ${ward}`,
    `Trạm y tế ${ward}`,
    `Trường tiểu học ${ward}`
  ];

  const landmarks = [
    `Chợ ${ward.replace(/Phường |Xã /g, "")}`,
    `Công viên ${ward.replace(/Phường |Xã /g, "")}`
  ];

  const roads: string[] = [];
  if (area.raw?.address?.road) {
    roads.push(area.raw.address.road);
  }

  return {
    ward,
    district_or_city,
    province_or_city,
    aliases,
    institutions,
    landmarks,
    roads
  };
}

export function generateQueries(profile: AreaProfile, customQuery?: string): string[] {
  const { ward, district_or_city, landmarks, roads } = profile;
  const wardShort = ward.replace(/Phường |Xã /g, "");
  const locationContext = `"${ward}" "${district_or_city}"`;

  const baseQueries = [
    `"${ward}"`,
    `UBND ${ward}`,
    `Công an ${ward}`,
    `${ward} tai nạn`,
    `${ward} cháy`,
    `${ward} ngập nước`,
    `${ward} khiếu nại`,
    `${ward} mất điện`,
    `${ward} lừa đảo`,
    `${ward} tin giả`,
    `${ward} tệ nạn`,
    `${ward} trộm cắp`,
    `${ward} cướp giật`,
    `${ward} biểu tình`,
    `${ward} tập trung đông người`,
    `${ward} phản ánh dân sinh`,
    `${district_or_city} ${ward} sự cố`
  ];

  // Platform specific queries
  const socialQueries = [
    `site:facebook.com "${ward}"`,
    `site:facebook.com "tôi ở ${wardShort}"`,
    `site:tiktok.com "${ward}"`,
    `site:tiktok.com "${wardShort}"`,
    `site:t.me "${wardShort}"`,
    `site:t.me "${ward}"`,
    `site:youtube.com "${ward}"`,
    `site:zalo.me "${wardShort}"`
  ];

  // Add custom query terms if provided
  if (customQuery) {
    const customTerms = customQuery.split(',').map(t => t.trim()).filter(Boolean);
    customTerms.forEach(term => {
      baseQueries.push(`${ward} ${term}`);
      baseQueries.push(`${district_or_city} ${term}`);
      socialQueries.push(`site:facebook.com "${term}" ${wardShort}`);
      socialQueries.push(`site:tiktok.com "${term}" ${wardShort}`);
      socialQueries.push(`site:t.me "${term}" ${wardShort}`);
    });
  }

  // Landmark & Road specific
  const infrastructureQueries = [
    ...landmarks.map(l => `${l} ${ward}`),
    ...roads.map(r => `${r} ${ward}`)
  ];

  // Combine and deduplicate
  const allQueries = [...new Set([...baseQueries, ...socialQueries, ...infrastructureQueries])];
  
  // Return a balanced set of queries (Gemini can handle a limited number of tools/queries effectively)
  return allQueries.slice(0, 25);
}
