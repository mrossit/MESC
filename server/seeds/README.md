# Formation Seeds

This directory contains database seed files for populating the formation system with initial content.

## Formation Seed

The `formation-seed.ts` file populates the database with:

- **2 Formation Tracks:**
  - Liturgy Track (`liturgy-track-1`): Formação Litúrgica Básica
  - Spirituality Track (`spirituality-track-1`): Formação Espiritual

- **6 Modules** (3 per track with comprehensive liturgical and spiritual content)

- **15 Lessons** with multiple sections each, covering topics such as:
  - The Eucharist in the Church
  - The Extraordinary Minister's identity and mission
  - Liturgical procedures
  - Prayer life
  - Sacraments
  - The Word of God
  - Christian virtues
  - Mary and the Saints

## How to Run the Seed

### Option 1: Via API Endpoint (Recommended)

**Prerequisites:**
- You must be logged in as a `gestor` or `coordenador`
- The server must be running

**Steps:**

1. Make a POST request to the seed endpoint:

```bash
# Using curl (replace with your actual URL and authentication)
curl -X POST https://your-domain.com/api/formation/admin/seed \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_AUTH_TOKEN"
```

2. Using JavaScript/Fetch in browser console:

```javascript
fetch('/api/formation/admin/seed', {
  method: 'POST',
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

3. Expected Response:

```json
{
  "success": true,
  "message": "Formation content seeded successfully",
  "stats": {
    "tracks": 2,
    "modules": 6,
    "lessons": 15
  }
}
```

### Option 2: Directly via Node.js

```bash
# From the project root
npx tsx server/seeds/formation-seed.ts
```

## Notes

- The seed is **idempotent** - it can be run multiple times safely. Existing tracks won't be duplicated.
- All content is in **Brazilian Portuguese** and follows Catholic liturgical and spiritual teachings
- Content is specifically designed for training Extraordinary Ministers of Holy Communion (MESC)
- The seed uses proper Catholic references (CIC, Vatican documents, Saints' teachings)

## Security

- The API endpoint is **protected** and requires authentication
- Only users with `gestor` or `coordenador` roles can access it
- Located under `/api/formation/admin/` route which has admin middleware

## Troubleshooting

If you encounter errors:

1. **Database connection issues**: Ensure the database is running and accessible
2. **Permission errors**: Verify you're logged in as gestor or coordenador
3. **Duplicate key errors**: This is expected if tracks already exist - the seed handles this gracefully
4. **Missing dependencies**: Run `npm install` to ensure all packages are installed

## Content Structure

Each lesson follows this structure:
- Title and description
- Learning objectives
- Duration estimate
- Multiple content sections with:
  - Section title
  - Rich text content
  - Estimated time per section
  - Proper theological and liturgical references

All content is designed to be progressive, building from foundational concepts to more advanced topics.
