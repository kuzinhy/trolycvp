import axios from 'axios';

interface GeocodeCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

const cache: GeocodeCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function reverseGeocode(lat: number, lng: number) {
  // Round coordinates to 5 decimal places for caching (~1.1m precision)
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  
  if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TTL)) {
    console.log(`Geocoding cache hit for ${cacheKey}`);
    return cache[cacheKey].data;
  }

  try {
    console.log(`Calling Nominatim for ${lat}, ${lng}`);
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'jsonv2',
        lat,
        lon: lng,
        addressdetails: 1,
        'accept-language': 'vi'
      },
      headers: {
        'User-Agent': 'ToxicInfoDetectionApp/1.0 (nguyenhuy.thudaumot@gmail.com)'
      },
      timeout: 5000
    });

    const address = response.data.address || {};
    
    // Infer ward from various fields
    const ward = address.suburb || address.quarter || address.neighbourhood || address.village || address.town || address.hamlet || address.ward || "";
    const district = address.city_district || address.district || address.county || address.city || "";
    const province = address.state || address.province || address.city || "";
    const formattedAddress = response.data.display_name || "";

    const result = {
      ward,
      district_or_city: district,
      province_or_city: province,
      formatted_address: formattedAddress,
      needs_manual_review: !ward,
      source: "nominatim",
      raw: response.data
    };

    cache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  } catch (error: any) {
    console.error("Nominatim error:", error.message);
    throw new Error("Không thể thực hiện reverse geocoding.");
  }
}
