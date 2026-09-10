import { HotelListing } from '../types';

// overlapping names with supplier A but different prices
const SUPPLIER_B_HOTELS: HotelListing[] = [
  { hotelId: 'b1', name: 'Holtin',       price: 5340,  city: 'delhi',    commissionPct: 20 },
  { hotelId: 'b2', name: 'Radison',      price: 6100,  city: 'delhi',    commissionPct: 18 },
  { hotelId: 'b3', name: 'Lemon Tree',   price: 3900,  city: 'delhi',    commissionPct: 7  },
  { hotelId: 'b4', name: 'The Lalit',    price: 7800,  city: 'delhi',    commissionPct: 16 },
  { hotelId: 'b5', name: 'Trident',      price: 8400,  city: 'mumbai',   commissionPct: 12 },
  { hotelId: 'b6', name: 'Marriott',     price: 6900,  city: 'mumbai',   commissionPct: 10 },
  { hotelId: 'b7', name: 'The Park',     price: 5200,  city: 'bangalore',commissionPct: 11 },
];

export function getSupplierBHotels(city?: string): HotelListing[] {
  if (!city) return SUPPLIER_B_HOTELS;
  const normalised = city.trim().toLowerCase();
  return SUPPLIER_B_HOTELS.filter((h) => h.city === normalised);
}
