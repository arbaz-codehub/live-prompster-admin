require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log("Checking Supabase Storage Buckets...");
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.error("Error fetching buckets:", bucketError);
    return;
  }

  if (buckets.length === 0) {
    console.log("No buckets found.");
    return;
  }

  for (const bucket of buckets) {
    console.log(`\nBucket: ${bucket.name} (Public: ${bucket.public})`);
    
    // Try to list files in the root of the bucket
    const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list('', {
      limit: 10,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (filesError) {
      console.log(`  Error listing files: ${filesError.message}`);
    } else {
      if (files.length === 0) {
        console.log("  (Empty bucket)");
      } else {
        files.forEach(f => {
          console.log(`  - ${f.name} (Folder: ${!f.id ? 'Yes' : 'No'})`);
        });
        if (files.length === 10) console.log("  ... (showing first 10 items)");
      }
    }
  }
}

checkStorage();
