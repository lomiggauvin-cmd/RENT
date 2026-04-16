import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/projects — list user's projects
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();

  // Verify token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      financing_details (*),
      works_furniture (*),
      advanced_parameters (*),
      market_data (*),
      scenario_results (*),
      short_term_parameters (*)
    `)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/projects — save a new project
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('[API] Auth failed:', authError);
    return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
  }

  const body = await request.json();
  const { formData, results } = body;

  console.log('[API] ═══ DÉBUT SAUVEGARDE ═══');
  console.log('[API] User ID:', user.id);
  console.log('[API] Project name:', body.name);

  try {
    // 1. Insert into "projects" table
    const projectPayload = {
      user_id: user.id,
      name: body.name ?? `${formData.property.city} - ${formData.property.surfaceM2}m²`,
      property_address: formData.property.address,
      property_city: formData.property.city,
      property_type: formData.property.propertyType,
      surface_m2: formData.property.surfaceM2,
      purchase_price: formData.property.purchasePrice,
      dpe_rating: formData.property.dpeRating,
      property_condition: formData.property.propertyCondition ?? 'good',
      photos: formData.photos ?? [],
    };
    console.log('[API] → INSERT projects:', JSON.stringify(projectPayload, null, 2));

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(projectPayload)
      .select()
      .single();

    if (projectError) {
      console.error('[API] ERREUR SUPABASE (projects):', projectError);
      return NextResponse.json({ error: projectError.message, details: projectError.details, hint: projectError.hint, table: 'projects' }, { status: 500 });
    }

    const projectId = project.id;
    console.log('[API] ✅ Project créé, ID:', projectId);

    // 2. Insert into "financing_details"
    if (formData.financing) {
      const financingPayload = {
        project_id: projectId,
        has_loan: formData.financing.hasLoan,
        loan_amount: formData.financing.loanAmount ?? 0,
        loan_duration_years: formData.financing.loanDurationYears ?? 20,
        interest_rate: formData.financing.interestRate ?? 0,
        monthly_payment: formData.financing.monthlyPayment ?? 0,
        insurance_monthly_amount: formData.financing.insuranceMonthlyAmount ?? 0,
      };
      console.log('[API] → INSERT financing_details:', JSON.stringify(financingPayload));
      const { error } = await supabase.from('financing_details').insert(financingPayload);
      if (error) {
        console.error('[API] ERREUR SUPABASE (financing_details):', error);
        return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, table: 'financing_details' }, { status: 500 });
      }
      console.log('[API] ✅ financing_details OK');
    }

    // 3. Insert into "works_furniture"
    if (formData.works) {
      const worksPayload = {
        project_id: projectId,
        renovation_cost: formData.works.renovationCost ?? 0,
        furniture_cost: formData.works.furnitureCost ?? 0,
        furniture_depreciation_years: 10,
        start_date: formData.works.startDate,
      };
      console.log('[API] → INSERT works_furniture:', JSON.stringify(worksPayload));
      const { error } = await supabase.from('works_furniture').insert(worksPayload);
      if (error) {
        console.error('[API] ERREUR SUPABASE (works_furniture):', error);
        return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, table: 'works_furniture' }, { status: 500 });
      }
      console.log('[API] ✅ works_furniture OK');
    }

    // 4. Insert into "advanced_parameters"
    if (formData.advanced) {
      const advancedPayload = {
        project_id: projectId,
        rent_inflation_rate: formData.advanced.rentInflationRate,
        property_appreciation_rate: formData.advanced.propertyAppreciationRate,
        expense_growth_rate: formData.advanced.expenseGrowthRate,
        projection_years: 15,
      };
      console.log('[API] → INSERT advanced_parameters:', JSON.stringify(advancedPayload));
      const { error } = await supabase.from('advanced_parameters').insert(advancedPayload);
      if (error) {
        console.error('[API] ERREUR SUPABASE (advanced_parameters):', error);
        return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, table: 'advanced_parameters' }, { status: 500 });
      }
      console.log('[API] ✅ advanced_parameters OK');
    }

    // 5. Insert into "market_data"
    if (formData.market) {
      const marketPayload = {
        project_id: projectId,
        avg_long_term_rent: formData.market.avgLongTermRent,
        avg_nightly_rate: formData.market.avgNightlyRate,
        airbnb_occupancy_rate: formData.market.airbnbOccupancyRate,
        monthly_occupancy_rates: formData.market.monthlyOccupancyRates,
        monthly_traveler_estimates: formData.market.monthlyTravelerEstimates,
        price_per_m2: formData.market.pricePerM2 ?? 0,
        city_tourism_score: formData.market.cityTourismScore ?? 70,
        data_source: formData.market.dataSource,
        fetched_at: new Date().toISOString(),
      };
      console.log('[API] → INSERT market_data:', JSON.stringify(marketPayload));
      const { error } = await supabase.from('market_data').insert(marketPayload);
      if (error) {
        console.error('[API] ERREUR SUPABASE (market_data):', error);
        return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, table: 'market_data' }, { status: 500 });
      }
      console.log('[API] ✅ market_data OK');
    }

    // 6. Insert into "scenario_results"
    if (results) {
      const scenarios = [
        { type: 'long_term', data: results.longTerm },
        { type: 'short_term', data: results.shortTerm },
        { type: 'mixed', data: results.mixed },
      ];
      for (const s of scenarios) {
        const scenarioPayload = {
          project_id: projectId,
          scenario_type: s.type,
          monthly_cash_flow: s.data.monthlyCashFlow,
          annual_cash_flow: s.data.annualCashFlow,
          gross_yield: s.data.grossYield,
          net_yield: s.data.netYield,
          optimal_fiscal_regime: s.data.optimalFiscalRegime,
          annual_tax_amount: s.data.annualTaxAmount,
          is_recommended: s.data.isRecommended,
          fifteen_year_projection: s.data.fifteenYearProjection,
        };
        console.log(`[API] → INSERT scenario_results (${s.type}):`, JSON.stringify(scenarioPayload));
        const { error } = await supabase.from('scenario_results').insert(scenarioPayload);
        if (error) {
          console.error(`[API] ERREUR SUPABASE (scenario_results/${s.type}):`, error);
          return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, table: `scenario_results/${s.type}` }, { status: 500 });
        }
        console.log(`[API] ✅ scenario_results (${s.type}) OK`);
      }
    }

    console.log('[API] ═══ SAUVEGARDE COMPLÈTE ═══ Project ID:', projectId);
    return NextResponse.json({ id: projectId, success: true });
  } catch (error) {
    console.error('[API] ERREUR FATALE:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save project', details: msg }, { status: 500 });
  }
}

// DELETE /api/projects?id=xxx
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

  const { error } = await supabase
    .from('projects')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH /api/projects?id=xxx — rename
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  if (!id || !body.name) return NextResponse.json({ error: 'ID and name required' }, { status: 400 });

  const { error } = await supabase
    .from('projects')
    .update({ name: body.name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
