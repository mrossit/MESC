# Testing the Fair Scheduling Algorithm

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Access the Auto Schedule Generation Page
Navigate to: `/auto-schedule-generation`

## Test Mode - Mock Data Testing

### What It Does
The test mode generates a complete month of schedules using **50 fictional ministers** with realistic characteristics:

- **Minister Characteristics:**
  - Varied experience levels (0-3+ years)
  - Different availability patterns (80% availability rate)
  - Preferred mass times (morning vs evening preferences)
  - Some ministers can serve as couples
  - Random substitution availability

- **Generated Schedules:**
  - All Sunday masses (8h, 10h, 19h)
  - Weekday masses (6:30)
  - Special monthly masses (1st Thu/Fri/Sat)
  - St. Jude day 28 masses
  - Special celebrations if within the test month

### How to Test

1. **Click the Test Button:**
   - Look for "Testar Algoritmo (Dados Fictícios)" button
   - Located in the "Primeira vez gerando escalas?" section

2. **Wait for Generation:**
   - Takes 2-5 seconds to generate
   - Creates ~30-40 masses (depending on month)
   - Assigns ministers to all positions

3. **Review Test Results:**

   **Statistics Overview:**
   - Missas Geradas: Total masses created
   - Cobertura: % of positions filled (target: >85%)
   - Confiança Média: Average confidence score (target: >65%)
   - Justiça: Fairness score (target: >70%)

   **Distribution Metrics:**
   - Ministros utilizados: How many of 50 were used
   - Média de atribuições: Average per minister (ideal: 2-3)
   - Variância: Distribution variance (lower is better)

   **Quality Breakdown:**
   - Alta confiança: High quality matches (target: >60%)
   - Média confiança: Acceptable matches
   - Baixa confiança: Forced assignments
   - Incompletas: Masses below minimum ministers

4. **Check for Outliers:**
   - Red alert box shows ministers with irregular assignments
   - "Too many" = more than 4 assignments
   - "Too few" = only 1 assignment

5. **Review Sample Schedules:**
   - First 5 masses shown with minister assignments
   - Green badge = fully staffed
   - Red badge = understaffed

### What to Look For

#### ✅ Good Results
- Coverage ≥ 85%
- Fairness score ≥ 70%
- Average confidence ≥ 65%
- Most schedules have high confidence
- Few or no outliers
- Sundays fully staffed

#### ⚠️ Warning Signs
- Coverage < 80% (not enough ministers available)
- Fairness < 60% (uneven distribution)
- Many outliers (algorithm needs tuning)
- Incomplete Sunday masses (critical issue)

#### ❌ Issues to Fix
- Coverage < 70% (algorithm failure)
- Fairness < 50% (very unfair distribution)
- More than 5 incomplete schedules
- All schedules low confidence

## Testing Different Scenarios

### Scenario 1: High Availability (80%+)
**Expected Results:**
- Coverage: 90-95%
- Fairness: 75-85%
- Confidence: 70-80%
- Few incomplete schedules

### Scenario 2: Medium Availability (60-70%)
**Expected Results:**
- Coverage: 80-90%
- Fairness: 65-75%
- Confidence: 60-70%
- Some incomplete weekday masses

### Scenario 3: Low Availability (40-50%)
**Expected Results:**
- Coverage: 70-80%
- Fairness: 60-70%
- Confidence: 50-60%
- Many incomplete weekday masses
- Outliers present (some overworked)

## API Testing

### Test Endpoint Directly
```bash
# Login first to get session cookie
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@mesc.com","password":"your-password"}'

# Get CSRF token
curl -b cookies.txt http://localhost:5000/api/csrf-token

# Run test generation
curl -b cookies.txt -X POST http://localhost:5000/api/schedules/test-generation \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{"ministerCount":50}' | jq .
```

### Expected Response Format
```json
{
  "success": true,
  "message": "Teste gerado com sucesso para 11/2025",
  "data": {
    "month": 11,
    "year": 2025,
    "mockData": {
      "ministerCount": 50,
      "ministers": [...],
      "availabilityCount": 50
    },
    "schedules": [...],
    "statistics": {
      "totalMasses": 38,
      "coverage": 87.5,
      "averageConfidence": 0.72,
      "fairnessScore": 78,
      "uniqueMinistersUsed": 42,
      "utilizationRate": 84,
      "outliers": [...]
    }
  }
}
```

## Production Testing

Once test mode shows good results, proceed to production:

1. **Create Real Questionnaires:**
   - Set up monthly questionnaire
   - Have ministers fill out availability

2. **Process Responses:**
   - Click "Atualizar Respostas dos Questionários"
   - Wait for processing completion

3. **Preview Generation:**
   - Select month/year
   - Click "Preview" button
   - Review results before saving

4. **Compare Results:**
   - Test mode results vs Real data results
   - Should have similar statistics
   - Real data may have lower coverage if ministers aren't available

5. **Fine-Tune if Needed:**
   - Adjust scoring weights in `scheduleGenerator.ts`
   - Modify mass requirements in `massConfig.ts`
   - Update penalty values for conflicts

## Troubleshooting

### Test Shows 0% Coverage
**Cause:** Algorithm couldn't assign any ministers
**Fix:** Check mock data generation - may need to adjust availability patterns

### All Schedules Low Confidence
**Cause:** Scoring algorithm too strict OR not enough available ministers
**Fix:** Lower threshold for acceptable scores OR increase mock minister availability

### Too Many Outliers
**Cause:** Fair distribution penalty too weak
**Fix:** Increase weight of fair distribution in scoring (currently 30%)

### Incomplete Sunday Masses
**Cause:** Critical issue - not enough ministers for high-priority masses
**Fix:** Increase mock minister count OR adjust availability patterns

### Test Takes Too Long (>10 seconds)
**Cause:** Too many ministers or complex month
**Fix:** Normal for first run. Subsequent runs use caching.

## Algorithm Validation Checklist

- [ ] Test mode generates schedules successfully
- [ ] Coverage is above 85%
- [ ] Fairness score is above 70%
- [ ] Average confidence is above 65%
- [ ] Sunday masses are fully staffed
- [ ] Outliers are minimal (<10% of ministers)
- [ ] Distribution variance is reasonable (<0.3)
- [ ] Special masses get priority staffing
- [ ] Ministers aren't assigned more than 4 times
- [ ] No family conflicts detected
- [ ] Sample schedules look realistic

Once all items are checked, the algorithm is validated and ready for production use!

## Next Steps After Successful Testing

1. Train coordinators on the system
2. Set up real questionnaires for next month
3. Have ministers submit availability
4. Run preview generation with real data
5. Compare results with test mode
6. Make manual adjustments if needed
7. Publish finalized schedule
8. Monitor minister feedback
9. Iterate on scoring weights if needed

## Support

If you encounter issues:
1. Check server logs for errors
2. Review test results statistics
3. Compare with expected results above
4. Adjust algorithm parameters if needed
5. Re-run test to verify fixes
