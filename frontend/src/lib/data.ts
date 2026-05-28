import type { Product } from '@/types';

export const WOMENS: Product[] = [
  { id: 1, name: "Royal Kanjivaram Gold Zari", cat: "Kanjivaram", price: 12999, mrp: 15999, badge: "pb-hot", "badge-text": "⭐ Bestseller", emoji: "🪡", bg: "linear-gradient(145deg,#2A1808,#8A4A18,#C4923A)", hook: "The crown jewel of every bridal trousseau", colors: ["#C4923A", "#8B1A1A", "#1A3A8A", "#1A6B4A"], gender: "women", tags: ["kanjivaram", "bridal", "bestseller"] },
  { id: 2, name: "Crimson Festive Silk", cat: "Festive Silk", price: 6499, mrp: 7999, badge: "pb-new", "badge-text": "✨ New", emoji: "🌹", bg: "linear-gradient(145deg,#3A0808,#8A1010,#C03030)", hook: "Deep crimson that glows at every celebration", colors: ["#8B1A1A", "#C4923A", "#1A6B4A"], gender: "women", tags: ["festive"] },
  { id: 3, name: "Midnight Blue Banarasi", cat: "Banarasi", price: 8999, mrp: 10999, badge: "pb-br", "badge-text": "💍 Bridal", emoji: "💫", bg: "linear-gradient(145deg,#0A1525,#1A3560,#2A5090)", hook: "The elegance of moonlight woven into silk", colors: ["#1A3560", "#5B1A8A", "#1A5A3A"], gender: "women", tags: ["banarasi", "bridal"] },
  { id: 4, name: "Champagne Bridal Kanjivaram", cat: "Kanjivaram", price: 18500, mrp: 22000, badge: "pb-br", "badge-text": "👑 Bridal", emoji: "✨", bg: "linear-gradient(145deg,#1A1208,#3A2818,#C4923A88)", hook: "Timeless ivory-gold for the modern bride", colors: ["#F5E4B8", "#C4923A", "#F9F6F0"], gender: "women", tags: ["kanjivaram", "bridal"] },
  { id: 5, name: "Rose Gold Patola Silk", cat: "Patola", price: 9750, mrp: 12000, badge: "pb-new", "badge-text": "🌸 New", emoji: "🌸", bg: "linear-gradient(145deg,#3A0A1A,#8A2A3A,#C06060)", hook: "Double ikat weave — a geometric masterpiece", colors: ["#C06060", "#C4923A", "#5B1A8A"], gender: "women", tags: ["patola"] },
  { id: 6, name: "Elegant Pastel Daily Silk", cat: "Daily Wear", price: 3299, mrp: 4299, badge: "pb-new", "badge-text": "🌿 Daily", emoji: "🌿", bg: "linear-gradient(145deg,#0A1818,#1A3828,#2A6848)", hook: "Soft pastels for the working woman", colors: ["#2A6848", "#C4923A", "#8B1A1A"], gender: "women", tags: ["daily"] },
  { id: 7, name: "Forest Green Kanjivaram", cat: "Kanjivaram", price: 14500, mrp: 17000, badge: "pb-new", "badge-text": "🌲 New", emoji: "🌲", bg: "linear-gradient(145deg,#041A08,#0A4A18,#187A30)", hook: "Rich forest green with signature gold zari border", colors: ["#187A30", "#C4923A", "#F5E4B8"], gender: "women", tags: ["kanjivaram"] },
  { id: 8, name: "Purple Mysore Silk", cat: "Mysore Silk", price: 4999, mrp: 6500, badge: "pb-new", "badge-text": "💜 Mysore", emoji: "💜", bg: "linear-gradient(145deg,#0A0418,#1A0A38,#3A1A58)", hook: "Smooth Mysore silk with vibrant purple lustre", colors: ["#3A1A58", "#C4923A", "#C06060"], gender: "women", tags: ["daily", "mysore"] },
];

export const MENS: Product[] = [
  { id: 101, name: "Pure Silk Dhoti — Gold Border", cat: "Silk Dhoti", price: 4999, mrp: 6499, badge: "pb-men", "badge-text": "👔 Men's", emoji: "🕌", bg: "linear-gradient(145deg,#04100A,#0A2A18,#206A40)", hook: "Classic gold zari border — perfect for temple & wedding", colors: ["#C4923A", "#FFFFFF", "#1A6B4A"], gender: "men", tags: ["dhoti", "wedding"] },
  { id: 102, name: "Kanjivaram Silk Veshti — Traditional", cat: "Veshti", price: 3499, mrp: 4499, badge: "pb-men", "badge-text": "🪭 Veshti", emoji: "🪭", bg: "linear-gradient(145deg,#080A18,#141A38,#2A3A78)", hook: "The pride of Tamil culture — pure Kanjivaram woven", colors: ["#FFFFFF", "#C4923A", "#D9A84E"], gender: "men", tags: ["veshti"] },
  { id: 103, name: "Silk Shirt — Deep Forest Green", cat: "Silk Shirt", price: 5499, mrp: 7000, badge: "pb-new", "badge-text": "✨ New", emoji: "👕", bg: "linear-gradient(145deg,#041A08,#0A3A18,#185A28)", hook: "Luxurious silk shirt for weddings and formal events", colors: ["#185A28", "#1A3A8A", "#C4923A"], gender: "men", tags: ["shirt"] },
  { id: 104, name: "Wedding Set — Dhoti + Angavastram", cat: "Wedding Set", price: 8999, mrp: 11000, badge: "pb-br", "badge-text": "💍 Wedding", emoji: "🎁", bg: "linear-gradient(145deg,#1A0C04,#3A1A08,#8A4A18)", hook: "Complete wedding look — coordinated gold zari set", colors: ["#C4923A", "#D9A84E", "#F5E4B8"], gender: "men", tags: ["set", "wedding"] },
  { id: 105, name: "Panchakacham — Ritual Wear", cat: "Panchakacham", price: 5999, mrp: 7500, badge: "pb-men", "badge-text": "🎗️ Ritual", emoji: "🎗️", bg: "linear-gradient(145deg,#0A0410,#1A0A28,#3A1A58)", hook: "Traditional 5-yard drape for pujas and ceremonies", colors: ["#D9A84E", "#FFFFFF", "#C4923A"], gender: "men", tags: ["panch"] },
  { id: 106, name: "Silk Kurta — Royal Navy", cat: "Silk Shirt", price: 4299, mrp: 5499, badge: "pb-new", "badge-text": "🌟 New", emoji: "🟦", bg: "linear-gradient(145deg,#040A18,#0A1838,#1A3068)", hook: "Regal navy silk kurta for festivals and family events", colors: ["#1A3068", "#C4923A", "#FFFFFF"], gender: "men", tags: ["shirt"] },
  { id: 107, name: "Cream Silk Veshti — Silver Border", cat: "Veshti", price: 2999, mrp: 3999, badge: "pb-men", "badge-text": "🤍 Classic", emoji: "🤍", bg: "linear-gradient(145deg,#1A1810,#2A2418,#4A3A28)", hook: "Pristine cream veshti with pure silver zari border", colors: ["#F9F6F0", "#C0C0C0", "#C4923A"], gender: "men", tags: ["veshti"] },
  { id: 108, name: "Silk Shirt — Burgundy", cat: "Silk Shirt", price: 5999, mrp: 7500, badge: "pb-new", "badge-text": "🍷 New", emoji: "🍷", bg: "linear-gradient(145deg,#1A0408,#3A0A14,#6A1A28)", hook: "Deep burgundy commanding presence for any formal event", colors: ["#6A1A28", "#C4923A", "#F5E4B8"], gender: "men", tags: ["shirt"] },
];

export const ALL_PRODUCTS = [...WOMENS, ...MENS];

export const SAMPLE_ORDERS = [
  { id: 'CSM-2847', product: WOMENS[0], status: 'shipped' as const, date: '17 Mar 2025', courier: 'BlueDart BD2847293' },
  { id: 'CSM-2831', product: MENS[3], status: 'delivered' as const, date: '10 Mar 2025', courier: 'BlueDart BD2831001' },
  { id: 'CSM-2820', product: WOMENS[1], status: 'delivered' as const, date: '2 Mar 2025', courier: 'DTDC D28200XX' },
];
