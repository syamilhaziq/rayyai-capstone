"""
Receipt Scanner API Endpoint
Provides AI-powered receipt scanning functionality
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from PIL import Image
import io
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
from sqlalchemy.orm import Session

import models
from routers.utils import get_current_user
from database import get_db
from routers.statement_processor import convert_pdf_to_images, image_to_bytes

# Load environment variables
load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# List available models for debugging
def list_available_models():
    """Debug function to list available models"""
    try:
        models_list = genai.list_models()
        return [m.name for m in models_list if 'generateContent' in m.supported_generation_methods]
    except Exception as e:
        return f"Error listing models: {str(e)}"

router = APIRouter()

# Categories for expense categorization
# Includes both English and Bahasa Malaysia keywords for better categorization
EXPENSE_CATEGORIES = {
    "Housing": ["rent", "rental", "housing", "accommodation", "apartment", "condo", "house", "lease", "sewa", "rumah", "sewa rumah", "bilik", "apartment", "kondo"],
    "Groceries": ["grocery", "supermarket", "market", "fresh", "vegetables", "fruits", "familymart", "family mart", "7-eleven", "tesco", "giant", "aeon", "pasar", "pasar malam", "pasar pagi", "kedai runcit", "mini market", "99 speedmart", "kk mart", "mydin", "sayur", "buah", "basah"],
    "Dining": [
        # English keywords
        "restaurant", "cafe", "coffee", "starbucks", "mcdonald", "kfc", "dining", "food court", "pizza", "burger", "sushi", "food", "eat", "lunch", "dinner", "breakfast", "brunch",
        # Bahasa Malaysia keywords
        "warung", "kedai", "restoran", "mamak", "kopitiam", "gerai", "stall", "nasi", "mee", "roti", "teh", "kopi", "makan", "minum", "buka puasa", "sahur",
        # Malaysian food places
        "old town", "secret recipe", "pappa rich", "nandos", "domino", "pizza hut", "subway", "marrybrown", "ramly", "ayam", "ikan", "daging",
        # Food delivery
        "grab food", "grabfood", "foodpanda", "deliveroo", "food delivery"
    ],
    "Transportation": ["fuel", "petrol", "gas", "taxi", "grab", "uber", "parking", "toll", "shell", "petronas", "bhp", "minyak", "bensin", "letak kereta", "tol", "lrt", "mrt", "ktm", "bas", "teksi", "kereta", "motor"],
    "Shopping": ["mall", "store", "shop", "clothing", "fashion", "apparel", "uniqlo", "h&m", "zara", "kedai", "butik", "pasaraya", "beli", "belian", "pembelian"],
    "Entertainment": ["cinema", "movie", "game", "entertainment", "theme park", "wayang", "pawagam", "gsc", "tgv", "mbo", "hiburan", "permainan"],
    "Healthcare": ["clinic", "hospital", "pharmacy", "medical", "doctor", "health", "guardian", "watsons", "klinik", "hospital", "farmasi", "doktor", "ubat", "kesihatan", "rawatan"],
    "Bills & Utilities": ["electric", "water", "internet", "phone", "bill", "utility", "telco", "bil", "elektrik", "air", "internet", "telefon", "tnb", "syabas", "tm", "unifi", "maxis", "celcom", "digi", "astro"],
    "Education": ["school", "university", "course", "book", "education", "tuition", "sekolah", "universiti", "kuliah", "buku", "pendidikan", "yuran", "tuisyen"],
    "Travel": ["hotel", "flight", "airbnb", "booking", "travel", "tourism", "hotel", "penerbangan", "kapal terbang", "perjalanan", "pelancongan", "cuti"],
    "Insurance": ["insurance", "takaful", "policy", "insurans", "takaful", "polis"],
    "Personal Care": ["salon", "spa", "beauty", "gym", "fitness", "salun", "kecantikan", "gim", "kecergasan", "grooming", "rambut", "facial"],
}

def guess_category(merchant_name: str) -> str:
    """Guess expense category based on merchant name"""
    merchant_lower = merchant_name.lower()

    for category, keywords in EXPENSE_CATEGORIES.items():
        if any(keyword in merchant_lower for keyword in keywords):
            return category

    return "Other"

def check_duplicate_receipt(
    db: Session,
    user_id: int,
    merchant: str,
    amount: float,
    date_str: str
) -> dict:
    """
    Check if a similar receipt already exists

    Returns dict with:
    - is_duplicate: bool
    - similar_transaction: dict or None (with id, description, date, amount)
    """
    try:
        # Parse the date
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        date_start = target_date - timedelta(days=1)
        date_end = target_date + timedelta(days=1)

        # Check expenses with similar merchant, amount, and date (±1 day)
        similar_expense = db.query(models.Expense).filter(
            models.Expense.user_id == user_id,
            models.Expense.merchant_name.ilike(f"%{merchant}%"),  # Case-insensitive partial match
            models.Expense.amount == amount,
            models.Expense.date_spent >= date_start,
            models.Expense.date_spent <= date_end
        ).first()

        if similar_expense:
            return {
                "is_duplicate": True,
                "similar_transaction": {
                    "id": similar_expense.expense_id,
                    "description": similar_expense.description or f"Expense at {similar_expense.merchant_name}",
                    "date": similar_expense.date_spent.strftime('%Y-%m-%d'),
                    "amount": float(similar_expense.amount),
                    "merchant": similar_expense.merchant_name,
                    "category": similar_expense.category
                }
            }

        # Check income with similar payer, amount, and date (±1 day)
        similar_income = db.query(models.Income).filter(
            models.Income.user_id == user_id,
            models.Income.payer.ilike(f"%{merchant}%"),
            models.Income.amount == amount,
            models.Income.date_received >= date_start,
            models.Income.date_received <= date_end
        ).first()

        if similar_income:
            return {
                "is_duplicate": True,
                "similar_transaction": {
                    "id": similar_income.income_id,
                    "description": similar_income.description or f"Income from {similar_income.payer}",
                    "date": similar_income.date_received.strftime('%Y-%m-%d'),
                    "amount": float(similar_income.amount),
                    "merchant": similar_income.payer,
                    "category": similar_income.source_category
                }
            }

        return {"is_duplicate": False, "similar_transaction": None}

    except Exception as e:
        print(f"Error checking duplicate: {str(e)}")
        return {"is_duplicate": False, "similar_transaction": None}

def extract_with_ai(image_bytes: bytes):
    """Extract transaction details using Gemini Vision AI"""
    try:
        if not GEMINI_API_KEY:
            return None, "Gemini API key not configured"

        # Initialize Gemini model with vision capabilities
        # Using gemini-2.0-flash (stable model with vision)
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Create prompt for extraction with AI categorization, Malaysian context, and confidence scoring
        prompt = """
        Analyze this receipt image and extract the following information in JSON format:

        {
          "merchant_name": "The store/merchant name (normalized - see rules below)",
          "raw_merchant_name": "Exact merchant name as shown on receipt",
          "amount": 12.50,
          "date": "2025-10-22",
          "reference_number": "Receipt or invoice number if visible",
          "items": ["List of items purchased if visible"],
          "category": "Food & Dining",
          "location": "Mid Valley, Kuala Lumpur",
          "payment_method": "GrabPay",
          "description": "Lunch at McDonald's, Mid Valley via GrabPay",
          "raw_text": "All text visible on the receipt",
          "confidence": {
            "merchant": 0.95,
            "amount": 0.99,
            "date": 0.87,
            "category": 0.92
          }
        }

        EXTRACTION RULES:

        1. **Merchant Name Normalization**:
           - Extract exact name as shown on receipt
           - Normalize common abbreviations to full names:
             * "MCD" / "MCDONALD" → "McDonald's"
             * "7-ELV" / "7-11" → "7-Eleven"
             * "PETRONAS STN" / "PDB" → "Petronas"
             * "SHELL STN" → "Shell"
             * "TSC" → "Tesco"
             * "AON" → "AEON"
             * "FAMILYMRT" → "FamilyMart"
           - Store both raw and normalized in response

        2. **CRITICAL - Amount extraction rules:**
           - Extract the TOTAL PRICE or GRAND TOTAL (the actual purchase amount)
           - DO NOT use "Amount Paid", "Cash", "Tendered", "Payment" amount
           - DO NOT use "Change", "Balance", "Change Due" amount
           - Look for labels like: "Total", "Grand Total", "Amount Due", "Net Total", "Sub Total + Tax"
           - If receipt shows: Amount Paid: 20, Total: 8.50, Change: 11.50 → Use 8.50 (the Total)
           - The amount should be what you actually spent, NOT what you paid or received back

        3. **Date Extraction**:
           - Extract date from receipt
           - Return in YYYY-MM-DD format
           - If date is unclear or missing, use null

        4. **Location Extraction** (NEW):
           - Look for location information on receipt (address, branch name, area)
           - Expand Malaysian location abbreviations:
             * KULJ / KL → Kuala Lumpur
             * PJ → Petaling Jaya
             * MID V / MIDVAL / MV → Mid Valley
             * KLCC / SURIA KLCC → KLCC
             * PAV / PAVILION → Pavilion KL
             * 1U / 1 UTAMA → 1 Utama
             * JB → Johor Bahru
             * PG / PNG → Penang
             * BGSR → Bangsar
             * DMNS / DAMANSARA → Damansara
             * SHL ALM / SHA → Shah Alam
           - Return in human-readable format (e.g., "Mid Valley, Kuala Lumpur")
           - If no location found, use null

        5. **Payment Method Detection** (NEW):
           - Identify payment type if visible on receipt:
             * "Cash" - if cash payment indicated
             * "Card" - if credit/debit card mentioned
             * "GrabPay" - if GrabPay/GRBPAY shown
             * "Touch n Go" / "TNG" - if TNG eWallet
             * "FPX" - if online banking transfer
             * "Boost" - if Boost eWallet
             * "ShopeePay" - if ShopeePay
           - If not visible, use null

        6. **Description Generation** (NEW):
           - Create natural, conversational descriptions
           - Use contextual verbs based on category (see below)
           - Format: "[Action] at/from [Merchant], [Location] [via Payment]"
           - Examples of good descriptions:
             * "Lunch at McDonald's, Mid Valley via GrabPay"
             * "Groceries from 7-Eleven in Bangsar"
             * "Fuel at Petronas, Damansara (Cash)"
             * "Coffee at Starbucks KLCC"
             * "Shopping at Uniqlo, Pavilion KL"
             * "Grab ride to Mid Valley"

           **Contextual Action Words by Category:**
           - Food & Dining: "Lunch at", "Dinner at", "Breakfast at", "Coffee at", "Meal at", "Snack from"
           - Groceries: "Groceries from", "Shopping at", "Purchase from"
           - Transportation: "Fuel at", "Parking at", "Grab ride to", "Taxi to", "Toll at"
           - Shopping: "Shopping at", "Purchase from", "Bought from"
           - Health & Fitness: "Medicine from", "Pharmacy at", "Gym at", "Workout at"
           - Entertainment: "Movie at", "Gaming at", "Entertainment at"
           - Personal Care: "Haircut at", "Spa at", "Salon at"

           - Avoid robotic formats like "Shop Name (Location)"
           - Keep it natural and conversational
           - Include location with "at", "in", or "," (not parentheses)
           - Add payment method at end if not cash: "via [Method]" or for cash: "(Cash)"

        7. **Confidence Scoring** (NEW):
           - For each extracted field, provide confidence score (0.0 to 1.0)
           - 1.0 = Completely certain
           - 0.9-0.99 = Very confident
           - 0.7-0.89 = Confident
           - 0.5-0.69 = Somewhat uncertain
           - <0.5 = Low confidence, manual verification needed
           - Base confidence on:
             * Text clarity and readability
             * Field visibility on receipt
             * Ambiguity in values

        8. Return ONLY valid JSON, no explanations or markdown

        EXPENSE CATEGORIES - Choose the MOST appropriate:

        - "Groceries": Supermarkets, convenience stores, wet markets, fresh produce
          Examples: FamilyMart, 7-Eleven, Tesco, Giant, AEON, MyDin, 99 Speedmart, KK Mart

        - "Food & Dining": Restaurants, cafes, fast food, food delivery, beverages
          Examples: McDonald's, KFC, Starbucks, Old Town, Kopitiam, Secret Recipe, food court, Grab Food

        - "Transportation": Fuel, parking, ride-sharing, tolls, public transport
          Examples: Shell, Petronas, Grab (rides), parking, Touch n Go, LRT, MRT, taxi

        - "Shopping": Retail stores, fashion, electronics, online shopping
          Examples: Uniqlo, Lazada, Shopee, Mr DIY, H&M, Zara, shopping mall

        - "Entertainment": Movies, streaming, games, theme parks, leisure
          Examples: Cinema, Netflix, Spotify, gym, theme park, GSC, TGV

        - "Health & Fitness": Pharmacies, clinics, medical supplies, gym, fitness
          Examples: Guardian, Watsons, pharmacy, clinic, gym, fitness center

        - "Utilities": Electric, water, internet, phone bills, cable
          Examples: TNB, Syabas, TM, Unifi, Maxis, Celcom, Astro

        - "Education": Books, courses, tuition, learning materials
          Examples: Bookstore, Popular, tuition center, university fees

        - "Travel": Hotels, flights, tourism, accommodation
          Examples: Hotel receipts, flight tickets, car rental, Airbnb

        - "Insurance": Insurance receipts, policy payments
          Examples: Insurance payment receipts, takaful

        - "Personal Care": Salons, spas, beauty products, wellness
          Examples: Salon, spa, barbershop, beauty store, massage

        - "Other": If none of the above clearly fit

        CATEGORIZATION TIPS:
        - Look at both merchant name AND items to determine category
        - "Starbucks" with food items → "Food & Dining"
        - "7-Eleven" with snacks/drinks → "Groceries" or "Food & Dining" (use judgment based on items)
        - "Shell" with fuel → "Transportation"
        - "Guardian" with medicine → "Health & Fitness"
        - Consider Malaysian context and local merchant patterns

        Return ONLY valid JSON with all fields including confidence scores.
        """

        # Generate content with image
        response = model.generate_content([
            prompt,
            {'mime_type': 'image/jpeg', 'data': image_bytes}
        ])

        # Parse JSON response
        json_text = response.text.strip()

        # Remove markdown code blocks if present
        if json_text.startswith('```json'):
            json_text = json_text[7:]
        if json_text.startswith('```'):
            json_text = json_text[3:]
        if json_text.endswith('```'):
            json_text = json_text[:-3]
        json_text = json_text.strip()

        # Parse JSON
        data = json.loads(json_text)

        return data, None

    except json.JSONDecodeError as e:
        return None, f"Failed to parse AI response as JSON: {str(e)}"
    except Exception as e:
        return None, f"AI extraction failed: {str(e)}"

@router.get("/available-models")
async def get_available_models(
    current_user: models.User = Depends(get_current_user)
):
    """
    Debug endpoint to list available Gemini models
    """
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key not configured"}

    return {"models": list_available_models()}

@router.post("/scan-receipt")
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scan a receipt image and extract transaction details using AI
    Includes duplicate detection and confidence scoring
    """

    # Check if AI is configured
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI scanning service is not configured"
        )

    # Validate file type
    is_pdf = file.content_type == 'application/pdf'
    is_image = file.content_type.startswith('image/')

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (PNG, JPG, JPEG) or PDF"
        )

    try:
        # Read file
        file_bytes = await file.read()

        # Process based on file type
        if is_pdf:
            # Convert PDF to images (use first page for receipt scanning)
            try:
                images = convert_pdf_to_images(file_bytes)
                if not images:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="PDF has no pages"
                    )
                # Use first page for receipt scanning
                image_bytes = image_to_bytes(images[0])
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to process PDF: {str(e)}"
                )
        else:
            # Validate image can be opened
            try:
                image = Image.open(io.BytesIO(file_bytes))
                # Convert to RGB if needed
                if image.mode != 'RGB':
                    image = image.convert('RGB')

                # Convert back to bytes
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='JPEG')
                image_bytes = img_byte_arr.getvalue()
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid image file: {str(e)}"
                )

        # Extract with AI
        ai_data, ai_error = extract_with_ai(image_bytes)

        if ai_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=ai_error
            )

        if not ai_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to extract data from receipt"
            )

        # Process extracted data
        merchant_name = ai_data.get('merchant_name', 'Unknown')
        raw_merchant_name = ai_data.get('raw_merchant_name', merchant_name)
        amount = ai_data.get('amount', 0)
        date_str = ai_data.get('date', datetime.now().strftime('%Y-%m-%d'))
        reference = ai_data.get('reference_number', '')
        items = ai_data.get('items', [])
        raw_text = ai_data.get('raw_text', '')
        location = ai_data.get('location')
        payment_method = ai_data.get('payment_method')
        ai_description = ai_data.get('description', '')
        confidence = ai_data.get('confidence', {})

        # Validate and parse amount
        try:
            amount = float(amount)
            if amount <= 0:
                amount = 1.0
        except (ValueError, TypeError):
            amount = 1.0

        # Validate date format
        try:
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
            date_str = parsed_date.strftime('%Y-%m-%d')
        except:
            date_str = datetime.now().strftime('%Y-%m-%d')

        # Use AI-provided category, fallback to keyword matching if not provided
        ai_category = ai_data.get('category', '')
        if ai_category:
            category = ai_category
            print(f"Using AI category '{category}' for merchant: {merchant_name}")
        else:
            # Fallback to keyword-based categorization
            category = guess_category(merchant_name)
            print(f"AI category missing, using fallback '{category}' for merchant: {merchant_name}")

        # Use AI description or generate fallback
        if ai_description:
            description = ai_description
        else:
            # Fallback: generate description from available data
            desc_parts = [merchant_name]
            if location:
                desc_parts.append(f"({location})")
            if payment_method:
                desc_parts.append(f"via {payment_method}")
            description = " ".join(desc_parts)

        # Check for duplicate receipts
        duplicate_check = check_duplicate_receipt(
            db=db,
            user_id=current_user.user_id,
            merchant=merchant_name,
            amount=amount,
            date_str=date_str
        )

        # Add validation warnings
        warnings = []

        # Amount sanity checks
        if amount > 10000:
            warnings.append({
                "type": "high_amount",
                "message": f"Large amount detected (RM {amount:.2f}) - please verify this is correct"
            })
        elif amount < 0.01:
            warnings.append({
                "type": "low_amount",
                "message": "Very small amount detected - possible scan error"
            })

        # Date validation
        try:
            receipt_date = datetime.strptime(date_str, '%Y-%m-%d')
            days_diff = (datetime.now() - receipt_date).days

            if receipt_date > datetime.now():
                warnings.append({
                    "type": "future_date",
                    "message": "Receipt date is in the future - please verify"
                })
            elif days_diff > 365:
                warnings.append({
                    "type": "old_receipt",
                    "message": f"Receipt is over {days_diff} days old ({receipt_date.strftime('%Y-%m-%d')})"
                })
        except:
            pass

        # Low confidence warnings
        for field, conf_value in confidence.items():
            if conf_value < 0.7:
                warnings.append({
                    "type": "low_confidence",
                    "field": field,
                    "confidence": conf_value,
                    "message": f"Low confidence for {field} ({conf_value:.0%}) - please verify"
                })

        # Build response with new fields
        response = {
            "merchant": merchant_name,
            "raw_merchant": raw_merchant_name,
            "amount": amount,
            "date": date_str,
            "reference": reference,
            "category": category,
            "description": description,
            "location": location,
            "payment_method": payment_method,
            "items": items,
            "raw_text": raw_text,
            "extraction_method": "AI Vision (Gemini 2.0 Flash)",
            "ai_categorized": bool(ai_category),
            "confidence": {
                "merchant": confidence.get('merchant', 0.5),
                "amount": confidence.get('amount', 0.5),
                "date": confidence.get('date', 0.5),
                "category": confidence.get('category', 0.5)
            },
            "duplicate_check": duplicate_check,
            "warnings": warnings if warnings else None
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process receipt: {str(e)}"
        )
