import { HotelListing } from '../types';

// overlapping hotel names with supplier B for dedup testing
const SUPPLIER_A_HOTELS: HotelListing[] = [
  { hotelId: 'a1', name: 'Holtin',       price: 6000,  city: 'delhi',    commissionPct: 10 },
  { hotelId: 'a2', name: 'Radison',      price: 5900,  city: 'delhi',    commissionPct: 13 },
  { hotelId: 'a3', name: 'Lemon Tree',   price: 4200,  city: 'delhi',    commissionPct: 8  },
  { hotelId: 'a4', name: 'Taj Palace',   price: 12500, city: 'delhi',    commissionPct: 12 },
  { hotelId: 'a5', name: 'ITC Grand',    price: 9800,  city: 'delhi',    commissionPct: 15 },
  { hotelId: 'a6', name: 'Marriott',     price: 7200,  city: 'mumbai',   commissionPct: 11 },
  { hotelId: 'a7', name: 'Oberoi',       price: 11000, city: 'mumbai',   commissionPct: 14 },
  { hotelId: 'a8', name: 'Hyatt Regency',price: 6500,  city: 'bangalore',commissionPct: 9  },
];

export function getSupplierAHotels(city?: string): HotelListing[] {
  if (!city) return SUPPLIER_A_HOTELS;
  const normalised = city.trim().toLowerCase();
  return SUPPLIER_A_HOTELS.filter((h) => h.city === normalised);
}
