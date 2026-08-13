import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fvhbbhppbazjeqpccwom.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGJiaHBwYmF6amVxcGNjd29tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUwODY3MywiZXhwIjoyMTAyMDg0NjczfQ.7R_xLHuW5zDteaTKC3XR2FPmJA5sjVAE1PofASzOAPM';

const adminDb = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const sourceSlug = 'nittala-ruthvik';
  console.log(`Fetching source centre: ${sourceSlug}...`);

  // 1. Fetch source centre
  const { data: source, error: sourceErr } = await adminDb
    .from('centres')
    .select('*')
    .eq('slug', sourceSlug)
    .single();

  if (sourceErr || !source) {
    console.error(`Source centre with slug "${sourceSlug}" not found:`, sourceErr?.message);
    return;
  }

  // 2. Generate unique slug for duplicate
  const targetName = `${source.name} Copy`;
  let targetSlug = 'nittala-ruthvik-copy';

  const { data: clash } = await adminDb
    .from('centres')
    .select('id')
    .eq('slug', targetSlug)
    .maybeSingle();

  if (clash) {
    targetSlug = `${targetSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // 3. Insert duplicated centre row
  const { id: _id, created_at: _c, updated_at: _u, slug: _s, ...centreFields } = source;
  const { data: newCentre, error: createErr } = await adminDb
    .from('centres')
    .insert({
      ...centreFields,
      name: targetName,
      slug: targetSlug,
      status: 'approved',
    })
    .select('*')
    .single();

  if (createErr || !newCentre) {
    console.error('Failed to insert duplicate centre:', createErr?.message);
    return;
  }

  console.log(`Created new centre: ${newCentre.name} (id: ${newCentre.id}, slug: ${newCentre.slug})`);

  // 4. Duplicate resources
  const { data: resources } = await adminDb
    .from('resources')
    .select('*')
    .eq('centre_id', source.id);

  if (resources && resources.length > 0) {
    const newResources = resources.map(({ id, centre_id, created_at, updated_at, ...res }) => ({
      ...res,
      centre_id: newCentre.id,
    }));
    await adminDb.from('resources').insert(newResources);
    console.log(`Duplicated ${resources.length} resource rows.`);
  }

  // 5. Duplicate amenities
  const { data: amenities } = await adminDb
    .from('centre_amenities')
    .select('*')
    .eq('centre_id', source.id);

  if (amenities && amenities.length > 0) {
    const newAmenities = amenities.map(({ centre_id, created_at, ...am }) => ({
      ...am,
      centre_id: newCentre.id,
    }));
    await adminDb.from('centre_amenities').insert(newAmenities);
    console.log(`Duplicated ${amenities.length} amenity rows.`);
  }

  // 6. Duplicate hours
  const { data: hours } = await adminDb
    .from('centre_hours')
    .select('*')
    .eq('centre_id', source.id);

  if (hours && hours.length > 0) {
    const newHours = hours.map(({ id, centre_id, created_at, updated_at, ...h }) => ({
      ...h,
      centre_id: newCentre.id,
    }));
    await adminDb.from('centre_hours').insert(newHours);
    console.log(`Duplicated ${hours.length} opening hour rows.`);
  }

  // 7. Duplicate gallery images
  const { data: images } = await adminDb
    .from('listing_images')
    .select('*')
    .eq('centre_id', source.id);

  if (images && images.length > 0) {
    const newImages = images.map(({ id, centre_id, created_at, ...img }) => ({
      ...img,
      centre_id: newCentre.id,
    }));
    await adminDb.from('listing_images').insert(newImages);
    console.log(`Duplicated ${images.length} gallery image rows.`);
  }

  console.log('SUCCESS!');
  console.log(`URL: http://localhost:3000/centres/${newCentre.slug}`);
}

run();
