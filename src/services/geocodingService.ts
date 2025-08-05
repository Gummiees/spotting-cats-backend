export interface GeocodingAddress {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

export interface NominatimResponse {
  address?: GeocodingAddress;
}

export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL =
    'https://nominatim.openstreetmap.org/reverse';

  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
      });

      const url = `${this.NOMINATIM_BASE_URL}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'BackendProject/1.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Nominatim API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as NominatimResponse;

      if (!data?.address) {
        return null;
      }

      let address = '';
      const city =
        data.address.city || data.address.town || data.address.village;

      if (city) {
        address += city;
      }

      const state = data.address.state;
      if (state) {
        address += `, ${state}`;
      }

      const country = data.address.country;
      if (country) {
        address += `, ${country}`;
      }

      return address.length > 0 ? address : null;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      throw new Error('Failed to perform reverse geocoding');
    }
  }
}
