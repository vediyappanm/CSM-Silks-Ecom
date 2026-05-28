"""CSM Silks — Seed database with realistic products."""
import asyncio
import uuid
from sqlalchemy import select
from app.database import engine, AsyncSessionLocal, Base
from app.models.product import Product, ProductCategory, ProductGender
from app.models.user import User, UserRole
from app.utils.auth import hash_password


PRODUCTS = [
    # ── KANJIVARAM ──────────────────────────────────────────────────────────
    {
        "sku": "CSM-KJ-001", "name": "Royal Kanjivaram Gold Zari Silk Saree",
        "name_tamil": "ராயல் காஞ்சீவரம் தங்க ஜரி பட்டு சேலை",
        "slug": "royal-kanjivaram-gold-zari",
        "hook": "The crown jewel of every bridal trousseau",
        "category": ProductCategory.KANJIVARAM, "gender": ProductGender.WOMEN,
        "price": 12999.0, "mrp": 15999.0, "cost_price": 8500.0,
        "stock_qty": 15, "fabric": "Pure Kanjivaram Silk", "zari_type": "Real Gold Zari",
        "colours": ["Gold", "Burgundy", "Green", "Navy"], "length_meters": 6.3,
        "images": ["/images/kanjivaram-gold-1.jpg", "/images/kanjivaram-gold-2.jpg"],
        "tags": ["kanjivaram", "bridal", "gold-zari", "premium"],
        "occasion": ["Wedding", "Engagement", "Festive"], "is_featured": True, "is_gi_tagged": True,
    },
    {
        "sku": "CSM-KJ-002", "name": "Temple Border Kanjivaram Silk Saree",
        "name_tamil": "கோயில் எல்லை காஞ்சீவரம் பட்டு சேலை",
        "slug": "temple-border-kanjivaram",
        "hook": "Divine temple motifs meet timeless silk",
        "category": ProductCategory.KANJIVARAM, "gender": ProductGender.WOMEN,
        "price": 8999.0, "mrp": 11999.0, "cost_price": 5800.0,
        "stock_qty": 22, "fabric": "Kanjivaram Silk", "zari_type": "Silver + Gold Zari",
        "colours": ["Red", "Maroon", "Orange", "Yellow"], "length_meters": 6.0,
        "images": ["/images/kanjivaram-temple-1.jpg"],
        "tags": ["kanjivaram", "temple", "traditional"],
        "occasion": ["Wedding", "Pooja", "Festival"], "is_featured": True, "is_gi_tagged": True,
    },
    {
        "sku": "CSM-KJ-003", "name": "Peacock Motif Kanjivaram Saree",
        "name_tamil": "மயில் வடிவ காஞ்சீவரம் பட்டு சேலை",
        "slug": "peacock-kanjivaram-silk",
        "hook": "Majestic peacocks woven in pure silk and gold",
        "category": ProductCategory.KANJIVARAM, "gender": ProductGender.WOMEN,
        "price": 10999.0, "mrp": 13999.0, "cost_price": 7200.0,
        "stock_qty": 10, "fabric": "Pure Kanjivaram Silk", "zari_type": "Real Gold Zari",
        "colours": ["Teal", "Peacock Blue", "Purple"], "length_meters": 6.3,
        "images": ["/images/kanjivaram-peacock-1.jpg"],
        "tags": ["kanjivaram", "peacock", "premium", "art-silk"],
        "occasion": ["Wedding", "Reception", "Party"], "is_featured": True, "is_gi_tagged": True,
    },
    # ── BANARASI ─────────────────────────────────────────────────────────────
    {
        "sku": "CSM-BN-001", "name": "Banarasi Silk Saree with Zari Brocade",
        "name_tamil": "பனாரசி பட்டு சேலை ஜரி ப்ரோக்கேட்",
        "slug": "banarasi-zari-brocade",
        "hook": "Varanasi's finest brocade artistry",
        "category": ProductCategory.BANARASI, "gender": ProductGender.WOMEN,
        "price": 7999.0, "mrp": 9999.0, "cost_price": 5200.0,
        "stock_qty": 18, "fabric": "Banarasi Silk", "zari_type": "Silver Zari",
        "colours": ["Pink", "Peach", "Mint", "Lavender"], "length_meters": 5.5,
        "images": ["/images/banarasi-brocade-1.jpg"],
        "tags": ["banarasi", "brocade", "party-wear"],
        "occasion": ["Festival", "Party", "Reception"], "is_featured": True,
    },
    {
        "sku": "CSM-BN-002", "name": "Banarasi Organza Saree with Resham Work",
        "name_tamil": "பனாரசி ஆர்கன்சா பட்டு சேலை",
        "slug": "banarasi-organza-resham",
        "hook": "Delicate organza with intricate resham embroidery",
        "category": ProductCategory.BANARASI, "gender": ProductGender.WOMEN,
        "price": 6499.0, "mrp": 8499.0, "cost_price": 4200.0,
        "stock_qty": 12, "fabric": "Banarasi Organza", "zari_type": "Resham Thread",
        "colours": ["White", "Ivory", "Pastel Pink", "Sky Blue"], "length_meters": 5.5,
        "images": ["/images/banarasi-organza-1.jpg"],
        "tags": ["banarasi", "organza", "summer", "lightweight"],
        "occasion": ["Party", "Engagement", "Bridal Shower"],
    },
    # ── PATOLA ───────────────────────────────────────────────────────────────
    {
        "sku": "CSM-PT-001", "name": "Double Ikat Patola Silk Saree",
        "name_tamil": "இரட்டை இக்காட் படோலா பட்டு சேலை",
        "slug": "double-ikat-patola-silk",
        "hook": "Mastercraft double ikat from the weavers of Patan",
        "category": ProductCategory.PATOLA, "gender": ProductGender.WOMEN,
        "price": 18999.0, "mrp": 24999.0, "cost_price": 12500.0,
        "stock_qty": 6, "fabric": "Pure Patola Silk", "zari_type": "Real Gold Zari",
        "colours": ["Magenta", "Yellow", "Green", "Red"], "length_meters": 5.5,
        "images": ["/images/patola-ikat-1.jpg"],
        "tags": ["patola", "ikat", "double-ikat", "heritage", "rare"],
        "occasion": ["Wedding", "Heirloom", "Special Occasion"], "is_featured": True,
    },
    {
        "sku": "CSM-PT-002", "name": "Geometric Patola Silk Saree",
        "name_tamil": "வடிவியல் படோலா பட்டு சேலை",
        "slug": "geometric-patola-silk",
        "hook": "Bold geometry meets ancient weaving tradition",
        "category": ProductCategory.PATOLA, "gender": ProductGender.WOMEN,
        "price": 14999.0, "mrp": 19999.0, "cost_price": 10000.0,
        "stock_qty": 4, "fabric": "Patola Silk", "zari_type": "Gold Zari",
        "colours": ["Blue", "Orange", "Purple", "Black"], "length_meters": 5.5,
        "images": ["/images/patola-geometric-1.jpg"],
        "tags": ["patola", "geometric", "contemporary"],
        "occasion": ["Festival", "Reception", "Party"],
    },
    # ── CHANDERI ─────────────────────────────────────────────────────────────
    {
        "sku": "CSM-CH-001", "name": "Chanderi Silk Saree with Zari Border",
        "name_tamil": "சாந்தேரி பட்டு சேலை ஜரி எல்லை",
        "slug": "chanderi-silk-zari-border",
        "hook": "Lightweight elegance for every occasion",
        "category": ProductCategory.CHANDERI, "gender": ProductGender.WOMEN,
        "price": 3999.0, "mrp": 5499.0, "cost_price": 2500.0,
        "stock_qty": 25, "fabric": "Chanderi Silk", "zari_type": "Silver Zari",
        "colours": ["Coral", "Mustard", "Mauve", "Turquoise"], "length_meters": 5.5,
        "images": ["/images/chanderi-zari-1.jpg"],
        "tags": ["chanderi", "lightweight", "daily-wear", "summer"],
        "occasion": ["Daily", "Office", "Festival"], "is_featured": True,
    },
    # ── MYSORE ───────────────────────────────────────────────────────────────
    {
        "sku": "CSM-MS-001", "name": "Mysore Silk Saree with Gold Border",
        "name_tamil": "மைசூர் பட்டு சேலை தங்க எல்லை",
        "slug": "mysore-silk-gold-border",
        "hook": "The silk that made Mysore famous",
        "category": ProductCategory.MYSORE, "gender": ProductGender.WOMEN,
        "price": 4999.0, "mrp": 6999.0, "cost_price": 3200.0,
        "stock_qty": 20, "fabric": "Pure Mysore Silk", "zari_type": "Gold Zari",
        "colours": ["Cream", "Gold", "Brown", "Bottle Green"], "length_meters": 5.5,
        "images": ["/images/mysore-gold-1.jpg"],
        "tags": ["mysore", "gold-border", "classic"],
        "occasion": ["Daily", "Festival", "Office"],
    },
    # ── TUSSAR ───────────────────────────────────────────────────────────────
    {
        "sku": "CSM-TS-001", "name": "Bhagalpuri Tussar Silk Saree",
        "name_tamil": "பாகல்பூர் டஸ்ஸர் பட்டு சேலை",
        "slug": "bhagalpuri-tussar-silk",
        "hook": "Earth-toned Tussar — naturally elegant",
        "category": ProductCategory.TUSSAR, "gender": ProductGender.WOMEN,
        "price": 3499.0, "mrp": 4999.0, "cost_price": 2200.0,
        "stock_qty": 18, "fabric": "Pure Tussar Silk", "zari_type": "None",
        "colours": ["Mustard", "Rust", "Natural", "Tan"], "length_meters": 5.5,
        "images": ["/images/tussar-natural-1.jpg"],
        "tags": ["tussar", "natural", "earthy", "organic"],
        "occasion": ["Daily", "Office", "Festival"],
    },
    # ── DHOTIS ────────────────────────────────────────────────────────────────
    {
        "sku": "CSM-MD-001", "name": "Pure Silk Veshti for Men",
        "name_tamil": "ஆண்களுக்கான பட்டு வேஷ்டி",
        "slug": "pure-silk-veshti-men",
        "hook": "Traditional silk veshti — pure, elegant, authentic",
        "category": ProductCategory.MENS_DHOTI, "gender": ProductGender.MEN,
        "price": 999.0, "mrp": 1499.0, "cost_price": 600.0,
        "stock_qty": 40, "fabric": "Pure Silk", "zari_type": "Gold Border",
        "colours": ["White", "Cream", "Gold Border White"], "length_meters": 2.25,
        "images": ["/images/veshti-silk-1.jpg"],
        "tags": ["veshti", "men", "traditional", "dhoti"],
        "occasion": ["Wedding", "Temple", "Festival"], "is_featured": True,
    },
    {
        "sku": "CSM-MD-002", "name": "Silk Angavastram with Zari Border",
        "name_tamil": "ஜரி எல்லை பட்டு அங்கவஸ்திரம்",
        "slug": "silk-angavastram-zari",
        "hook": "The finishing touch to your festive look",
        "category": ProductCategory.MENS_VESHTI, "gender": ProductGender.MEN,
        "price": 599.0, "mrp": 899.0, "cost_price": 350.0,
        "stock_qty": 50, "fabric": "Pure Silk", "zari_type": "Gold Zari",
        "colours": ["Cream", "Gold", "Orange"], "length_meters": 1.5,
        "images": ["/images/angavastram-1.jpg"],
        "tags": ["angavastram", "men", "festive"],
        "occasion": ["Wedding", "Temple", "Festival"],
    },
    # ── SILK SHIRTS ──────────────────────────────────────────────────────────
    {
        "sku": "CSM-MS-002", "name": "Pure Silk Kurta Set for Men",
        "name_tamil": "ஆண்களுக்கான பட்டு குர்தா செட்",
        "slug": "pure-silk-kurta-men",
        "hook": "Handwoven silk kurta set — festive perfection",
        "category": ProductCategory.MENS_SET, "gender": ProductGender.MEN,
        "price": 2499.0, "mrp": 3499.0, "cost_price": 1600.0,
        "stock_qty": 15, "fabric": "Pure Silk", "zari_type": "Thread Work",
        "colours": ["Ivory", "Maroon", "Blue", "Green"], "length_meters": None,
        "images": ["/images/kurta-set-1.jpg"],
        "tags": ["kurta", "men", "festive", "set"],
        "occasion": ["Wedding", "Festival", "Party"],
    },
    # ── VESHITIS ─────────────────────────────────────────────────────────────
    {
        "sku": "CSM-MV-001", "name": "Embroidered Silk Shirt for Men",
        "name_tamil": "ஆண்களுக்கான பட்டு சட்டை",
        "slug": "embroidered-silk-shirt-men",
        "hook": "Hand-embroidered silk for the modern gentleman",
        "category": ProductCategory.MENS_SHIRT, "gender": ProductGender.MEN,
        "price": 1999.0, "mrp": 2999.0, "cost_price": 1200.0,
        "stock_qty": 12, "fabric": "Raw Silk", "zari_type": "Thread Embroidery",
        "colours": ["White", "Black", "Blue", "Grey"], "length_meters": None,
        "images": ["/images/silk-shirt-1.jpg"],
        "tags": ["shirt", "men", "embroidered", "silk"],
        "occasion": ["Wedding", "Party", "Office", "Festival"],
    },
]


async def seed():
    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created")

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(Product).limit(1))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"✅ DB already has products. Skipping seed (remove csm_silks.db to re-seed).")
            await db.close()
            return

        # Create products
        for pdata in PRODUCTS:
            product = Product(**pdata)
            db.add(product)

        # Create admin user
        admin = User(
            phone="+919999999999",
            email="admin@csmsilks.com",
            full_name="CSM Admin",
            hashed_password=hash_password("admin123"),
            role=UserRole.SUPER_ADMIN,
            is_verified=True,
            is_active=True,
        )
        db.add(admin)

        # Create a test customer
        customer = User(
            phone="+918888888888",
            email="customer@example.com",
            full_name="Test Customer",
            hashed_password=hash_password("customer123"),
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        db.add(customer)

        await db.commit()
        print(f"✅ Seeded {len(PRODUCTS)} products + admin/customer users!")
        print(f"   Admin:    admin@csmsilks.com / admin123")
        print(f"   Customer: customer@example.com / customer123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
