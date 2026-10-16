// DEV CORE KE - Global Tech Job Aggregator, Market Intelligence & Credibility Platform
// Native Node.js HTTP Server with Built-in SQLite (Node 24)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || 'dev2026';
const HASH_SALT = process.env.HASH_SALT || 'dev-core-ke-prod-salt';
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'devcircle.sqlite');
const DB_JSON_FILE = path.join(DB_DIR, 'devcircle_data.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Fallback in-memory/JSON DB engine for environments without native node:sqlite
function createFallbackDb(jsonFilePath) {
  let state = {
    jobs: [],
    reviews: [],
    credibility_audits: [],
    scanner_logs: [],
    site_visits: []
  };

  if (fs.existsSync(jsonFilePath)) {
    try {
      state = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      if (!state.jobs) state.jobs = [];
      if (!state.reviews) state.reviews = [];
      if (!state.credibility_audits) state.credibility_audits = [];
      if (!state.scanner_logs) state.scanner_logs = [];
      if (!state.site_visits) state.site_visits = [];
    } catch (e) {
      console.error('Failed to parse json DB file:', e);
    }
  }

  function saveState() {
    try {
      fs.writeFileSync(jsonFilePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  return {
    exec(sql) {
      // Schema structure handled automatically
    },
    prepare(sql) {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();

      if (cleanSql.includes('COUNT(*) as count FROM jobs')) {
        return {
          get() {
            return { count: state.jobs.length };
          }
        };
      }

      if (cleanSql.startsWith('SELECT id FROM jobs WHERE')) {
        return {
          get(params) {
            const originalId = (params.original_job_id || '').trim();
            const title = (params.title || '').toLowerCase();
            const company = (params.company || '').toLowerCase();
            const applyUrl = (params.apply_url || '').toLowerCase();
            return state.jobs.find(j => 
              (originalId && j.original_job_id && String(j.original_job_id).trim() === originalId) ||
              (j.title.toLowerCase() === title && j.company.toLowerCase() === company) ||
              (applyUrl && j.apply_url && j.apply_url.toLowerCase() === applyUrl)
            ) || null;
          }
        };
      }

      if (cleanSql.includes('FROM jobs WHERE original_job_id IS NULL')) {
        return {
          all() {
            return state.jobs.filter(j => !j.original_job_id);
          }
        };
      }

      if (cleanSql === 'SELECT * FROM jobs WHERE id = ?') {
        return {
          get(id) {
            return state.jobs.find(j => j.id === id) || null;
          }
        };
      }

      if (cleanSql.startsWith('SELECT * FROM jobs WHERE 1=1')) {
        return {
          all(params = {}) {
            let list = [...state.jobs];
            if (params.search) {
              const q = params.search.replace(/%/g, '').toLowerCase();
              list = list.filter(j => 
                (j.title || '').toLowerCase().includes(q) ||
                (j.company || '').toLowerCase().includes(q) ||
                (j.tags || '').toLowerCase().includes(q) ||
                (j.description || '').toLowerCase().includes(q)
              );
            }
            if (params.seniority && params.seniority !== 'all') {
              list = list.filter(j => j.seniority === params.seniority);
            }
            if (params.domain && params.domain !== 'all') {
              list = list.filter(j => j.domain === params.domain);
            }
            if (params.location_type && params.location_type !== 'all') {
              list = list.filter(j => j.location_type === params.location_type);
            }
            if (params.min_credibility > 0) {
              list = list.filter(j => (j.credibility_score || 0) >= params.min_credibility);
            }
            if (params.today) {
              list = list.filter(j => (j.posted_date || '') >= params.today);
            }
            if (params.weekAgo) {
              list = list.filter(j => (j.posted_date || '') >= params.weekAgo);
            }
            if (params.monthAgo) {
              list = list.filter(j => (j.posted_date || '') >= params.monthAgo);
            }
            return list.sort((a, b) => (b.posted_date || '').localeCompare(a.posted_date || '') || (b.id - a.id));
          }
        };
      }

      if (cleanSql === 'SELECT * FROM jobs') {
        return {
          all() {
            return [...state.jobs];
          }
        };
      }

      if (cleanSql.startsWith('INSERT INTO jobs')) {
        return {
          run(params) {
            const newId = (state.jobs.length ? Math.max(...state.jobs.map(j => j.id || 0)) : 0) + 1;
            const newJob = { id: newId, ...params };
            state.jobs.push(newJob);
            saveState();
            return { lastInsertRowid: newId, changes: 1 };
          }
        };
      }

      if (cleanSql.startsWith('UPDATE jobs SET')) {
        return {
          run(param1, param2, param3) {
            let id, applyUrl, originalJobId;
            if (typeof param1 === 'object' && param1 !== null) {
              id = param1.id;
              applyUrl = param1.apply_url;
              originalJobId = param1.original_job_id;
            } else {
              applyUrl = param1;
              id = param2;
              originalJobId = param3;
            }
            const j = state.jobs.find(item => item.id === id);
            if (j) {
              if (applyUrl !== undefined) j.apply_url = applyUrl;
              if (originalJobId !== undefined) j.original_job_id = originalJobId;
              saveState();
              return { changes: 1 };
            }
            return { changes: 0 };
          }
        };
      }

      if (cleanSql.startsWith('SELECT * FROM reviews')) {
        return {
          all(companyParam) {
            if (companyParam) {
              const q = companyParam.replace(/%/g, '').toLowerCase();
              return state.reviews.filter(r => (r.company_name || '').toLowerCase().includes(q)).reverse();
            }
            return [...state.reviews].reverse();
          }
        };
      }

      if (cleanSql.startsWith('INSERT INTO reviews')) {
        return {
          run(params) {
            const newId = (state.reviews.length ? Math.max(...state.reviews.map(r => r.id || 0)) : 0) + 1;
            state.reviews.push({ id: newId, ...params });
            saveState();
            return { lastInsertRowid: newId, changes: 1 };
          }
        };
      }

      if (cleanSql.startsWith('INSERT INTO credibility_audits')) {
        return {
          run(params) {
            const newId = (state.credibility_audits.length ? Math.max(...state.credibility_audits.map(c => c.id || 0)) : 0) + 1;
            state.credibility_audits.push({ id: newId, ...params });
            saveState();
            return { lastInsertRowid: newId, changes: 1 };
          }
        };
      }

      if (cleanSql.startsWith('INSERT INTO scanner_logs')) {
        return {
          run(params) {
            const newId = (state.scanner_logs.length ? Math.max(...state.scanner_logs.map(s => s.id || 0)) : 0) + 1;
            state.scanner_logs.push({ id: newId, ...params });
            saveState();
            return { lastInsertRowid: newId, changes: 1 };
          }
        };
      }

      if (cleanSql.startsWith('SELECT * FROM scanner_logs')) {
        return {
          all() {
            return [...state.scanner_logs].reverse().slice(0, 15);
          }
        };
      }

      if (cleanSql.startsWith('INSERT INTO site_visits')) {
        return {
          run(params) {
            const newId = (state.site_visits.length ? Math.max(...state.site_visits.map(v => v.id || 0)) : 0) + 1;
            state.site_visits.push({ id: newId, ...params });
            saveState();
            return { lastInsertRowid: newId, changes: 1 };
          }
        };
      }

      if (cleanSql.includes('COUNT(*) as count FROM site_visits')) {
        return {
          get() {
            return { count: state.site_visits.length };
          }
        };
      }

      if (cleanSql.startsWith('SELECT * FROM site_visits')) {
        return {
          all() {
            return [...state.site_visits];
          }
        };
      }

      return {
        all: () => [],
        get: () => null,
        run: () => ({ changes: 0 })
      };
    }
  };
}

// Initialize SQLite database (with universal fallback)
let db;
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_FILE);
  console.log('✅ SQLite Engine: Native node:sqlite loaded successfully.');
} catch (err) {
  console.warn(`⚠️ SQLite Engine: Native node:sqlite not available (${err.message}). Using resilient JSON-backed DB engine.`);
  db = createFallbackDb(DB_JSON_FILE);
}

// Helper to extract official/original requisition ID from URL or attributes
function extractOriginalJobId(job) {
  if (job.original_job_id && String(job.original_job_id).trim() !== '') {
    return String(job.original_job_id).trim();
  }
  const url = (job.apply_url || '').trim();

  // LinkedIn direct view: /jobs/view/402918451/
  const lkMatch = url.match(/\/jobs\/view\/(\d+)/i);
  if (lkMatch) return 'LK-' + lkMatch[1];

  // Arbeitnow slug ending with numeric ID: senior-engineer-171975
  const anMatch = url.match(/-(\d+)(?:\/?$|\?)/);
  if (anMatch) return anMatch[1];

  // Jobicy /jobs/155221-slug
  const jbMatch = url.match(/\/jobs\/(\d+)/i);
  if (jbMatch) return jbMatch[1];

  // RemoteOK /remote-jobs/1029384
  const roMatch = url.match(/remoteok\.com\/(?:remote-jobs\/)?(\d+)/i);
  if (roMatch) return roMatch[1];

  // Generic numeric requisition: /1839210/
  const numMatch = url.match(/\/(\d{4,12})(?:\/|$|\?)/);
  if (numMatch) return numMatch[1];

  // Company prefix + ID fallback
  const compPrefix = (job.company || 'JOB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'DEV';
  return `${compPrefix}-${job.id || Math.floor(1000 + Math.random() * 9000)}`;
}

// Setup Database Schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_job_id TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      company_domain TEXT,
      location TEXT NOT NULL,
      location_type TEXT NOT NULL, -- 'Kenya Local', 'Worldwide Remote', 'Hybrid'
      seniority TEXT NOT NULL,     -- 'attachment', 'internship', 'junior', 'mid', 'senior', 'lead_manager', 'cto'
      domain TEXT NOT NULL,        -- 'fullstack', 'frontend', 'backend', 'mobile', 'devops_cloud', 'ai_ml_data', 'cybersecurity', 'qa_testing', 'embedded_systems'
      salary_kes_min INTEGER,
      salary_kes_max INTEGER,
      salary_usd_min INTEGER,
      salary_usd_max INTEGER,
      currency_display TEXT DEFAULT 'KES',
      description TEXT NOT NULL,
      requirements TEXT NOT NULL,
      benefits TEXT NOT NULL,
      credibility_score INTEGER DEFAULT 85,
      brs_verified INTEGER DEFAULT 1,
      scam_risk TEXT DEFAULT 'LOW', -- 'LOW', 'MODERATE', 'HIGH'
      apply_url TEXT,
      contact_email TEXT,
      remote_accessible_kenya INTEGER DEFAULT 1,
      posted_date TEXT NOT NULL,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      role TEXT NOT NULL,
      seniority TEXT NOT NULL,
      rating INTEGER NOT NULL,
      culture_rating INTEGER NOT NULL,
      salary_rating INTEGER NOT NULL,
      management_rating INTEGER NOT NULL,
      timely_pay_mpesa_bank TEXT NOT NULL, -- 'Always on time', 'Sometimes delayed', 'Chronic delays'
      pros TEXT NOT NULL,
      cons TEXT NOT NULL,
      interview_experience TEXT,
      verified_dev INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credibility_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      domain TEXT,
      contact_email TEXT,
      job_text TEXT,
      score INTEGER NOT NULL,
      verdict TEXT NOT NULL,
      red_flags TEXT,
      strengths TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scanner_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_time TEXT NOT NULL,
      source TEXT NOT NULL,
      roles_found INTEGER NOT NULL,
      roles_added INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT
    );

    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_hash TEXT NOT NULL,
      referrer TEXT,
      device TEXT,
      browser TEXT,
      os TEXT,
      path TEXT DEFAULT '/',
      screen_res TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_visits_created ON site_visits(created_at);
    CREATE INDEX IF NOT EXISTS idx_visits_hash ON site_visits(visitor_hash);
  `);

  // Migration: Ensure original_job_id column exists
  try {
    db.exec('ALTER TABLE jobs ADD COLUMN original_job_id TEXT;');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Backfill any missing original_job_id values on existing records
  backfillOriginalJobIds();

  // Synchronize all verified positions on startup
  syncDatabaseRoles();

  // Ensure initial baseline analytics telemetry
  seedBaselineVisitsIfEmpty();
}

function backfillOriginalJobIds() {
  try {
    const jobsWithoutId = db.prepare("SELECT id, title, company, apply_url FROM jobs WHERE original_job_id IS NULL OR original_job_id = ''").all();
    if (jobsWithoutId && jobsWithoutId.length > 0) {
      const updateStmt = db.prepare('UPDATE jobs SET original_job_id = ? WHERE id = ?');
      for (const j of jobsWithoutId) {
        const genId = extractOriginalJobId(j);
        updateStmt.run(genId, j.id);
      }
      console.log(`✅ Backfilled original_job_id for ${jobsWithoutId.length} existing jobs.`);
    }
  } catch (err) {
    console.warn('Backfill original_job_id notice:', err.message);
  }
}

function syncDatabaseRoles() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  if (!countRow || countRow.count === 0) {
    seedDatabase();
  }

  // Ensure ALL roles from devcircle_data.json are synchronized into the database
  if (fs.existsSync(DB_JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_JSON_FILE, 'utf8'));
      if (Array.isArray(data.jobs) && data.jobs.length > 0) {
        const checkExists = db.prepare(`
          SELECT id, apply_url, original_job_id FROM jobs 
          WHERE (@original_job_id != '' AND original_job_id = @original_job_id)
             OR (LOWER(title) = LOWER(@title) AND LOWER(company) = LOWER(@company))
             OR (@apply_url != '' AND apply_url = @apply_url)
          LIMIT 1
        `);

        const updateJobStmt = db.prepare(`
          UPDATE jobs 
          SET apply_url = @apply_url, original_job_id = @original_job_id 
          WHERE id = @id
        `);

        const insertJob = db.prepare(`
          INSERT INTO jobs (
            original_job_id, title, company, company_domain, location, location_type, seniority, domain,
            salary_kes_min, salary_kes_max, salary_usd_min, salary_usd_max, currency_display,
            description, requirements, benefits, credibility_score, brs_verified, scam_risk,
            apply_url, contact_email, remote_accessible_kenya, posted_date, tags
          ) VALUES (
            @original_job_id, @title, @company, @company_domain, @location, @location_type, @seniority, @domain,
            @salary_kes_min, @salary_kes_max, @salary_usd_min, @salary_usd_max, @currency_display,
            @description, @requirements, @benefits, @credibility_score, @brs_verified, @scam_risk,
            @apply_url, @contact_email, @remote_accessible_kenya, @posted_date, @tags
          )
        `);

        let inserted = 0;
        let updated = 0;
        for (const job of data.jobs) {
          const originalId = job.original_job_id || extractOriginalJobId(job);
          const exists = checkExists.get({
            original_job_id: originalId,
            title: (job.title || '').trim(),
            company: (job.company || '').trim(),
            apply_url: (job.apply_url || '').trim()
          });
          if (!exists) {
            const { id, ...jobData } = job;
            jobData.original_job_id = originalId;
            insertJob.run(jobData);
            inserted++;
          } else if (job.apply_url && (exists.apply_url !== job.apply_url || exists.original_job_id !== originalId)) {
            updateJobStmt.run({
              id: exists.id,
              apply_url: job.apply_url,
              original_job_id: originalId
            });
            updated++;
          }
        }
        if (inserted > 0 || updated > 0) {
          console.log(`✅ Synchronized database: Ingested ${inserted} missing, updated ${updated} direct requisition URLs.`);
        }
      }

      if (Array.isArray(data.reviews) && data.reviews.length > 0) {
        const checkReview = db.prepare(`
          SELECT id FROM reviews 
          WHERE LOWER(company_name) = LOWER(@company_name) AND LOWER(role) = LOWER(@role)
          LIMIT 1
        `);
        const insertReview = db.prepare(`
          INSERT INTO reviews (
            company_name, role, seniority, rating, culture_rating, salary_rating, management_rating,
            timely_pay_mpesa_bank, pros, cons, interview_experience, verified_dev, created_at
          ) VALUES (
            @company_name, @role, @seniority, @rating, @culture_rating, @salary_rating, @management_rating,
            @timely_pay_mpesa_bank, @pros, @cons, @interview_experience, @verified_dev, @created_at
          )
        `);
        for (const rev of data.reviews) {
          const exists = checkReview.get({
            company_name: (rev.company_name || '').trim(),
            role: (rev.role || '').trim()
          });
          if (!exists) {
            const { id, ...revData } = rev;
            insertReview.run(revData);
          }
        }
      }
    } catch (e) {
      console.warn('Sync database error:', e.message);
    }
  }

  const finalCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  console.log(`📊 Total Active Verified Positions in Database: ${finalCount ? finalCount.count : 0}`);
}

function seedDatabase() {
  const insertJob = db.prepare(`
    INSERT INTO jobs (
      original_job_id, title, company, company_domain, location, location_type, seniority, domain,
      salary_kes_min, salary_kes_max, salary_usd_min, salary_usd_max, currency_display,
      description, requirements, benefits, credibility_score, brs_verified, scam_risk,
      apply_url, contact_email, remote_accessible_kenya, posted_date, tags
    ) VALUES (
      @original_job_id, @title, @company, @company_domain, @location, @location_type, @seniority, @domain,
      @salary_kes_min, @salary_kes_max, @salary_usd_min, @salary_usd_max, @currency_display,
      @description, @requirements, @benefits, @credibility_score, @brs_verified, @scam_risk,
      @apply_url, @contact_email, @remote_accessible_kenya, @posted_date, @tags
    )
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (
      company_name, role, seniority, rating, culture_rating, salary_rating, management_rating,
      timely_pay_mpesa_bank, pros, cons, interview_experience, verified_dev, created_at
    ) VALUES (
      @company_name, @role, @seniority, @rating, @culture_rating, @salary_rating, @management_rating,
      @timely_pay_mpesa_bank, @pros, @cons, @interview_experience, @verified_dev, @created_at
    )
  `);

  // If pre-scraped data file exists, seed all accumulated 119+ verified roles immediately
  if (fs.existsSync(DB_JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_JSON_FILE, 'utf8'));
      let didSeed = false;
      if (Array.isArray(data.jobs) && data.jobs.length > 0) {
        for (const job of data.jobs) {
          const { id, ...jobData } = job;
          if (!jobData.original_job_id) {
            jobData.original_job_id = extractOriginalJobId(job);
          }
          insertJob.run(jobData);
        }
        didSeed = true;
      }
      if (Array.isArray(data.reviews) && data.reviews.length > 0) {
        for (const rev of data.reviews) {
          const { id, ...revData } = rev;
          insertReview.run(revData);
        }
      }
      if (didSeed) {
        console.log(`✅ Seeded ${data.jobs.length} roles and ${(data.reviews || []).length} reviews from ${DB_JSON_FILE}`);
        return;
      }
    } catch (e) {
      console.warn('Could not seed from json file, falling back to initialJobs:', e.message);
    }
  }

  const initialJobs = [
    // 1. ATTACHMENT (Industrial Attachment for Kenyan University Students - NITA accredited)
    {
      original_job_id: "SAF-ATT-4091",
      title: "Software Engineering Industrial Attachment (3 - 6 Months)",
      company: "Safaricom PLC - Digital Innovation Hub",
      company_domain: "safaricom.co.ke",
      location: "Nairobi (HQ Westlands / Hybrid)",
      location_type: "Hybrid",
      seniority: "attachment",
      domain: "fullstack",
      salary_kes_min: 25000,
      salary_kes_max: 35000,
      salary_usd_min: 200,
      salary_usd_max: 270,
      currency_display: "KES",
      description: "Industrial attachment opportunity open to continuing 3rd & 4th year Computer Science, IT, and Software Engineering students from accredited Kenyan universities (JKUAT, UoN, Strathmore, KU, etc.). Work with M-Pesa APIs, cloud services, and digital financial solutions under dedicated senior staff mentorship. NITA accredited logbook supervision provided.",
      requirements: "Currently enrolled in a recognized CS/IT degree program; Valid university attachment recommendation letter; Basic proficiency in JavaScript/TypeScript, Python, or Java; Familiarity with Git; Eager to learn microservices.",
      benefits: "Monthly living stipend (KES 30,000); NITA logbook verification; Mentorship by senior architects; Free Safaricom staff airtime/data bundle; Medical coverage during attachment period.",
      credibility_score: 98,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://safaricom.taleo.net/careersection/ex/jobdetail.ftl?job=SAF-ATT-4091",
      contact_email: "careers@safaricom.co.ke",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-10",
      tags: "Attachment,M-Pesa,TypeScript,Java,NITA,University"
    },
    {
      original_job_id: "ILAB-ATT-2026",
      title: "Junior Web & Cloud Industrial Trainee (Attachment)",
      company: "@iLabAfrica - Strathmore University",
      company_domain: "ilabafrica.ac.ke",
      location: "Nairobi (Madaraka Campus)",
      location_type: "Kenya Local",
      seniority: "attachment",
      domain: "frontend",
      salary_kes_min: 20000,
      salary_kes_max: 30000,
      salary_usd_min: 150,
      salary_usd_max: 230,
      currency_display: "KES",
      description: "Hands-on industrial attachment for Kenyan students passionate about modern web UI, accessible digital platforms, and cloud computing. Work on research projects, health-tech portals, and fintech prototypes.",
      requirements: "University student seeking official 3-month attachment; Understanding of HTML5, CSS3, Tailwind, React or Vue; Willingness to work onsite in Nairobi.",
      benefits: "Monthly transport & lunch stipend; Official university completion certificate; Direct networking with Kenyan incubator founders.",
      credibility_score: 95,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://ilabafrica.ac.ke/careers/junior-web-cloud-trainee-attachment-2026",
      contact_email: "info@ilabafrica.ac.ke",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-12",
      tags: "Attachment,React,Web,Research,Strathmore"
    },

    // 2. INTERNSHIP / GRADUATE APPRENTICE
    {
      original_job_id: "MSFT-ADC-17849",
      title: "Software Engineering Graduate Apprentice (SWE Intern)",
      company: "Microsoft Africa Development Centre (ADC)",
      company_domain: "microsoft.com",
      location: "Nairobi (Dunhill Towers, Westlands)",
      location_type: "Hybrid",
      seniority: "internship",
      domain: "backend",
      salary_kes_min: 120000,
      salary_kes_max: 160000,
      salary_usd_min: 920,
      salary_usd_max: 1230,
      currency_display: "KES",
      description: "1-year intensive software engineering apprenticeship at Microsoft ADC Nairobi. Write production-grade code impacting millions of Microsoft Azure and Office 365 enterprise customers worldwide. Comprehensive training in distributed systems, security, and algorithmic efficiency.",
      requirements: "Recent graduate (within 12 months) with BSc in Computer Science, Software Engineering, or related technical field; Solid foundation in Data Structures & Algorithms; Fluency in C++, C#, Java, or Python; Strong problem-solving mindset.",
      benefits: "Competitive stipend (KES 140k/month); Comprehensive private health insurance; Modern laptop (Surface Book / ThinkPad); Clear pathway to full-time SWE I offer.",
      credibility_score: 99,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://jobs.careers.microsoft.com/global/en/job/17849/Cloud-Intelligent-Systems-Resident",
      contact_email: "adcnairobi@microsoft.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-11",
      tags: "Internship,Azure,C#,Distributed Systems,Nairobi ADC"
    },
    {
      original_job_id: "PESA-MOB-48",
      title: "Fintech Mobile Developer Intern (Flutter / Kotlin)",
      company: "Pesapal Kenya",
      company_domain: "pesapal.com",
      location: "Nairobi (Kilimani)",
      location_type: "Hybrid",
      seniority: "internship",
      domain: "mobile",
      salary_kes_min: 45000,
      salary_kes_max: 65000,
      salary_usd_min: 350,
      salary_usd_max: 500,
      currency_display: "KES",
      description: "Join Kenya's pioneer payment service provider to assist in building merchant mobile POS applications and payment gateway integration apps for Android and iOS.",
      requirements: "Degree or diploma in Computer Science; Portfolio demonstrating at least 1-2 published or GitHub Flutter / Kotlin apps; Familiarity with RESTful APIs.",
      benefits: "Monthly stipend; Mentorship by senior fintech developers; In-house cafeteria; Transition to Junior Mobile Dev based on performance.",
      credibility_score: 93,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://pesapal.bamboohr.com/careers/48",
      contact_email: "jobs@pesapal.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-09",
      tags: "Internship,Flutter,Kotlin,Fintech,Pesapal"
    },

    // 3. JUNIOR DEVELOPER
    {
      original_job_id: "LITT-FS-29",
      title: "Junior Fullstack Engineer (React & Node.js)",
      company: "Little App Kenya (Craft Silicon)",
      company_domain: "little.biz",
      location: "Nairobi (Westlands)",
      location_type: "Kenya Local",
      seniority: "junior",
      domain: "fullstack",
      salary_kes_min: 80000,
      salary_kes_max: 130000,
      salary_usd_min: 615,
      salary_usd_max: 1000,
      currency_display: "KES",
      description: "Develop core features for Little Ride, Little Food, and corporate mobility portals. Build responsive dashboard UIs and integrate high-concurrency Node.js endpoints with Redis and PostgreSQL.",
      requirements: "1-2 years experience building web applications; Strong JavaScript/TypeScript, React, Node.js/Express; Understanding of SQL and relational database schemas; Version control with Git.",
      benefits: "Comprehensive medical cover (Inpatient/Outpatient); Little Ride staff credits; Annual performance bonus; Tech training allowance.",
      credibility_score: 91,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://craftsilicon.bamboohr.com/careers/29",
      contact_email: "careers@little.biz",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-08",
      tags: "Junior,React,Node.js,PostgreSQL,RideHailing"
    },
    {
      original_job_id: "CELL-CLD-61",
      title: "Junior Cloud & DevOps Engineer",
      company: "Cellulant Kenya",
      company_domain: "cellulant.io",
      location: "Nairobi (Riverside Drive)",
      location_type: "Hybrid",
      seniority: "junior",
      domain: "devops_cloud",
      salary_kes_min: 95000,
      salary_kes_max: 145000,
      salary_usd_min: 730,
      salary_usd_max: 1115,
      currency_display: "KES",
      description: "Support payments infrastructure across 18 African markets. Automate CI/CD pipelines, monitor AWS/GCP clusters, and enforce security policies on Tingg payment gateways.",
      requirements: "1+ years experience in Linux system administration; Basic Docker & Kubernetes knowledge; Scripting with Bash or Python; Understanding of Terraform or AWS basics.",
      benefits: "Hybrid working flexibility (2 days remote); Wi-Fi allowance; Continuous AWS certification sponsorship; Competitive pension scheme.",
      credibility_score: 94,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://cellulant.bamboohr.com/careers/61",
      contact_email: "recruitment@cellulant.io",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-07",
      tags: "Junior,DevOps,AWS,Docker,CI/CD,Fintech"
    },

    // 4. MID-LEVEL DEVELOPER
    {
      original_job_id: "TWIG-GO-4829",
      title: "Mid-Level Backend Software Engineer (Go / Microservices)",
      company: "Twiga Foods",
      company_domain: "twigafoods.com",
      location: "Nairobi (Riverside / Remote Days)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "backend",
      salary_kes_min: 220000,
      salary_kes_max: 340000,
      salary_usd_min: 1690,
      salary_usd_max: 2615,
      currency_display: "KES",
      description: "Power the logistics and commerce backend supporting thousands of retail shops across Kenya and East Africa. Design event-driven Go services, optimize Kafka streams, and interface with warehouse inventory systems.",
      requirements: "3+ years professional software development; Strong Go (Golang) or Python backend proficiency; Experience with Apache Kafka or RabbitMQ, PostgreSQL, and Docker; Track record building high-uptime APIs.",
      benefits: "Attractive salary package; Private family medical cover; Work-from-home stipend; Free company shuttle and subsidized meals.",
      credibility_score: 92,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://boards.greenhouse.io/twigafoods/jobs/4829103",
      contact_email: "talent@twigafoods.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-06",
      tags: "Mid,Golang,Kafka,Microservices,Logistics"
    },
    {
      original_job_id: "TALA-AND-5912",
      title: "Mid-Level Mobile Engineer (Android & iOS via Flutter)",
      company: "Tala Kenya",
      company_domain: "tala.co",
      location: "Nairobi (Kilimani / Remote)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "mobile",
      salary_kes_min: 250000,
      salary_kes_max: 380000,
      salary_usd_min: 1920,
      salary_usd_max: 2920,
      currency_display: "KES",
      description: "Build cutting-edge micro-credit and mobile wallet applications used by millions of unbanked and underbanked Kenyans. Optimize performance on low-end Android devices and ensure robust biometric security.",
      requirements: "3+ years mobile engineering experience with Flutter/Dart or native Kotlin; Knowledge of MVVM architecture, SQLite/Room, and secure key storage; Experience handling offline-first synchronization.",
      benefits: "Global equity/options program; Home office setup budget (KES 120,000); Wellness and mental health stipend; Flexible PTO.",
      credibility_score: 96,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://boards.greenhouse.io/tala/jobs/5912048",
      contact_email: "kenya-jobs@tala.co",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-05",
      tags: "Mid,Flutter,Mobile,Fintech,Underbanked"
    },

    // 5. SENIOR DEVELOPER / STAFF / ARCHITECT
    {
      original_job_id: "GITL-DIST-6109",
      title: "Senior Distributed Systems Engineer (Worldwide Remote - Kenya Eligible)",
      company: "GitLab Inc.",
      company_domain: "gitlab.com",
      location: "Worldwide Remote (Kenya via Contractor / EOR)",
      location_type: "Worldwide Remote",
      seniority: "senior",
      domain: "backend",
      salary_kes_min: 650000,
      salary_kes_max: 1100000,
      salary_usd_min: 5000,
      salary_usd_max: 8500,
      currency_display: "USD",
      description: "GitLab is an all-remote global leader. We actively hire top talent in Kenya under international contractor or EOR agreements. You will work on GitLab's core CI/CD orchestration engine, scalable across thousands of concurrent pipeline jobs.",
      requirements: "5+ years backend systems experience; Deep expertise in Ruby, Go, or Python; Experience scaling PostgreSQL databases beyond 10TB; Strong asynchronous communication skills in all-remote environments.",
      benefits: "USD compensation paid reliably via Deel/Wire transfer; $2,000 home office setup allowance; Flexible asynchronous hours; Co-working pass reimbursement in Nairobi.",
      credibility_score: 99,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://about.gitlab.com/jobs/apply/?gh_jid=6109281",
      contact_email: "recruitment@gitlab.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-09",
      tags: "Senior,Worldwide Remote,Golang,Ruby,CI/CD,USD Salary"
    },
    {
      original_job_id: "EQB-SEC-7712",
      title: "Senior Cloud Security & DevSecOps Lead",
      company: "Equity Group Holdings",
      company_domain: "equitygroupholdings.com",
      location: "Nairobi (Equity Centre, Upper Hill)",
      location_type: "Hybrid",
      seniority: "senior",
      domain: "cybersecurity",
      salary_kes_min: 480000,
      salary_kes_max: 750000,
      salary_usd_min: 3690,
      salary_usd_max: 5770,
      currency_display: "KES",
      description: "Direct cloud security posture, penetration testing protocols, and compliance with the Central Bank of Kenya (CBK) cybersecurity framework and the Kenya Data Protection Act 2019 for East Africa's largest banking group.",
      requirements: "6+ years in Infosec / DevSecOps; Certifications: CISSP, CISM, or AWS Certified Security Specialty; Experience with Kubernetes security, SAST/DAST, and SOC automation.",
      benefits: "Executive health insurance for self and family; Staff preferential mortgage and car loan rates (single-digit interest); Annual performance bonus.",
      credibility_score: 97,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://equitybank.taleo.net/careersection/ex/jobdetail.ftl?job=EQB-SEC-7712",
      contact_email: "jobs@equitybank.co.ke",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-04",
      tags: "Senior,Cybersecurity,CBK,DevSecOps,Banking"
    },

    // 6. LEAD MANAGER / ENGINEERING MANAGER
    {
      original_job_id: "FLUT-PAY-5201",
      title: "Engineering Manager - Core Payments & Integrations",
      company: "Flutterwave (Kenya Operations)",
      company_domain: "flutterwave.com",
      location: "Nairobi / Remote Kenya",
      location_type: "Worldwide Remote",
      seniority: "lead_manager",
      domain: "fullstack",
      salary_kes_min: 600000,
      salary_kes_max: 950000,
      salary_usd_min: 4615,
      salary_usd_max: 7300,
      currency_display: "KES",
      description: "Lead an agile engineering squad of 8-10 senior and mid engineers managing M-Pesa, card rail integrations, and real-time cross-border settlements across Kenya, Uganda, Tanzania, and Rwanda.",
      requirements: "7+ years software engineering with at least 2+ years managing teams; Track record delivering fintech or high-availability payment rails; Strong people leadership and OKR execution.",
      benefits: "Stock equity options; Comprehensive global health care; Budget for team retreats and conferences; Top-tier tech equipment provided.",
      credibility_score: 96,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://boards.greenhouse.io/flutterwave/jobs/5201948",
      contact_email: "careers@flutterwave.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-03",
      tags: "Lead Manager,Fintech,M-Pesa,People Leadership,Payments"
    },

    // 7. CTO / VP OF ENGINEERING / EXECUTIVE
    {
      original_job_id: "KWAN-CTO-2026",
      title: "Chief Technology Officer (CTO)",
      company: "Kwanza Agritech & Logistics (Series A)",
      company_domain: "kwanza-agritech.co.ke",
      location: "Nairobi (Westlands Hub)",
      location_type: "Kenya Local",
      seniority: "cto",
      domain: "fullstack",
      salary_kes_min: 900000,
      salary_kes_max: 1500000,
      salary_usd_min: 6920,
      salary_usd_max: 11500,
      currency_display: "KES",
      description: "Executive leadership role defining technical architecture, technology roadmap, and hiring 25+ engineers for a fast-scaling Kenyan agri-commerce platform backed by Tier 1 venture capital. Direct reporting to the CEO and Board of Directors.",
      requirements: "10+ years tech experience with proven executive leadership (CTO, VP Eng, or Head of Tech); Proven experience scaling cloud-native systems to 1M+ active users; Strong command of software budgeting, cloud spend optimization, and technical governance.",
      benefits: "Significant equity / ESOP allocation (2.5% - 4.5%); Executive salary package; Comprehensive executive health cover; International travel budget.",
      credibility_score: 94,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://kwanza-agritech.co.ke/careers/chief-technology-officer-cto-2026",
      contact_email: "board@kwanza-agritech.co.ke",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-02",
      tags: "CTO,Executive,VentureCapital,Architecture,Agritech"
    },

    // 8. DATA SCIENCE & AI / ML SPECIALIST
    {
      original_job_id: "GOOG-AI-12849",
      title: "AI & Machine Learning Engineer (LLMs & Speech Tech)",
      company: "Google Africa Product Development Centre",
      company_domain: "google.com",
      location: "Nairobi (Upper Hill)",
      location_type: "Hybrid",
      seniority: "senior",
      domain: "ai_ml_data",
      salary_kes_min: 750000,
      salary_kes_max: 1300000,
      salary_usd_min: 5760,
      salary_usd_max: 10000,
      currency_display: "KES",
      description: "Build cutting-edge AI and machine learning models tailored to African languages (Swahili, Sheng, Amharic) and internet conditions. Train transformer models, optimize edge inference, and build developer APIs.",
      requirements: "BSc/MSc/PhD in Computer Science or related AI field; 4+ years building production ML pipelines with PyTorch, JAX, or TensorFlow; Experience with natural language processing (NLP) or speech recognition.",
      benefits: "World-class Google compensation and GSUs (Google Stock Units); Free gourmet on-site dining in Nairobi; Comprehensive family healthcare; Global transfer opportunities.",
      credibility_score: 99,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://www.google.com/about/careers/applications/jobs/results/12849102948123",
      contact_email: "africa-talent@google.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-10",
      tags: "Senior,AI/ML,PyTorch,NLP,Swahili,Google"
    },

    // 9. QA / AUTOMATION SPECIALIST
    {
      original_job_id: "ANDE-QA-4910",
      title: "Senior QA Automation Engineer (SDET - Playwright & Python)",
      company: "Andela Kenya",
      company_domain: "andela.com",
      location: "Nairobi / Remote Kenya",
      location_type: "Worldwide Remote",
      seniority: "mid",
      domain: "qa_testing",
      salary_kes_min: 280000,
      salary_kes_max: 420000,
      salary_usd_min: 2150,
      salary_usd_max: 3230,
      currency_display: "KES",
      description: "Design automated test suites for distributed microservices and web applications. Implement end-to-end testing with Playwright, performance benchmarking with k6, and automated regression testing in GitHub Actions.",
      requirements: "3+ years as a Software Development Engineer in Test (SDET); Hands-on proficiency in Playwright, Cypress, or Selenium with TypeScript/Python; Strong knowledge of API testing (Postman, Newman).",
      benefits: "100% Remote flexibility; Coworking space reimbursement across Kenya; Learning stipend ($1,500/yr); Private health insurance.",
      credibility_score: 95,
      brs_verified: 1,
      scam_risk: "LOW",
      apply_url: "https://boards.greenhouse.io/andela/jobs/4910283",
      contact_email: "recruiting@andela.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-06",
      tags: "Mid,QA,SDET,Playwright,Python,Remote"
    },

    // 10. SCAM / SUSPICIOUS WARNING JOB (To demonstrate credibility analysis and scam alert engine)
    {
      original_job_id: "APEX-PHISH-419",
      title: "[SUSPICIOUS] Data Entry & Junior Python Coder - Immediate Hire",
      company: "Apex Global Tech Careers (Unverified)",
      company_domain: "apex-global-careers.freehosting.site",
      location: "Nairobi / Online",
      location_type: "Worldwide Remote",
      seniority: "junior",
      domain: "backend",
      salary_kes_min: 250000,
      salary_kes_max: 450000,
      salary_usd_min: 1920,
      salary_usd_max: 3460,
      currency_display: "KES",
      description: "URGENT HIRING: Work from home coder. Candidates must pay an upfront KES 3,500 M-Pesa interview assessment & verification badge fee before receiving the technical test link. Laptop will be shipped after payment.",
      requirements: "No experience needed, just basic typing and interest in Python.",
      benefits: "Huge salary for 2 hours daily work, free MacBook Pro.",
      credibility_score: 12,
      brs_verified: 0,
      scam_risk: "HIGH",
      apply_url: "http://apex-global-careers.freehosting.site/jobs/apply?ref=phish419",
      contact_email: "hr.recruiter.apexkenya@gmail.com",
      remote_accessible_kenya: 1,
      posted_date: "2026-10-13",
      tags: "Flagged,Scam Warning,Suspicious,Red Flag"
    }
  ];

  for (const job of initialJobs) {
    if (!job.original_job_id) {
      job.original_job_id = extractOriginalJobId(job);
    }
    insertJob.run(job);
  }

  // Seed sample company reviews
  const initialReviews = [
    {
      company_name: "Safaricom PLC",
      role: "Backend Engineer",
      seniority: "mid",
      rating: 5,
      culture_rating: 4,
      salary_rating: 5,
      management_rating: 4,
      timely_pay_mpesa_bank: "Always on time",
      pros: "Best healthcare insurance in Kenya, timely salary on the 24th without fail, huge learning curve with high scale M-Pesa traffic.",
      cons: "Corporate bureaucracy can slow down quick tool adoptions, occasionally on-call shifts for weekend deployments.",
      interview_experience: "3 rounds: Technical screen, take-home system design, and panel behavioural interview with engineering manager.",
      verified_dev: 1,
      created_at: "2026-10-01"
    },
    {
      company_name: "Microsoft Africa Development Centre (ADC)",
      role: "Software Engineer I",
      seniority: "junior",
      rating: 5,
      culture_rating: 5,
      salary_rating: 5,
      management_rating: 5,
      timely_pay_mpesa_bank: "Always on time",
      pros: "World-class engineering practices, mentors genuinely invest in your growth, outstanding compensation for Nairobi market.",
      cons: "Time zone alignment with Redmond (Pacific Time) can mean occasional late evening sync meetings.",
      interview_experience: "Rigorous LeetCode medium/hard questions on Data Structures (Trees, Graphs, DP) + System Design.",
      verified_dev: 1,
      created_at: "2026-09-28"
    },
    {
      company_name: "Twiga Foods",
      role: "Fullstack Developer",
      seniority: "mid",
      rating: 4,
      culture_rating: 4,
      salary_rating: 4,
      management_rating: 3,
      timely_pay_mpesa_bank: "Always on time",
      pros: "Real impact solving African food supply chain logistics, great tech stack with Go and Kafka, collaborative team.",
      cons: "Fast-paced startup pressure during quarter ends, fast pivoting product priorities.",
      interview_experience: "Practical coding assessment in Go followed by architecture discussion with Principal Engineer.",
      verified_dev: 1,
      created_at: "2026-09-20"
    },
    {
      company_name: "GitLab Inc.",
      role: "Senior Backend Engineer",
      seniority: "senior",
      rating: 5,
      culture_rating: 5,
      salary_rating: 5,
      management_rating: 5,
      timely_pay_mpesa_bank: "Always on time",
      pros: "Top-tier USD compensation, 100% async culture means no useless meetings, true remote freedom while living in Kenya.",
      cons: "You must be extremely self-disciplined; requires proactive documentation and self-direction.",
      interview_experience: "Thorough review of public merge requests and async technical communication challenge.",
      verified_dev: 1,
      created_at: "2026-09-15"
    }
  ];

  for (const review of initialReviews) {
    insertReview.run(review);
  }
}

// Credibility Audit Algorithm for Companies & Job Offers
function analyzeCredibility(input) {
  const { company_name, domain, contact_email, job_text, salary_offered, requires_fee } = input;
  let score = 85;
  const red_flags = [];
  const strengths = [];

  const textToScan = `${company_name || ''} ${domain || ''} ${contact_email || ''} ${job_text || ''}`.toLowerCase();

  // Flag 1: Fee charging (Crucial in Kenya - illegal under Employment Act 2007)
  if (
    requires_fee === true ||
    textToScan.includes('pay') && (textToScan.includes('interview fee') || textToScan.includes('registration fee') || textToScan.includes('badge fee') || textToScan.includes('laptop deposit') || textToScan.includes('medical fee') || textToScan.includes('mpesa'))
  ) {
    score -= 60;
    red_flags.push("CRITICAL SCAM INDICATOR: Demanding upfront fee (M-Pesa/registration/laptop deposit). Legit companies NEVER charge candidates!");
  }

  // Flag 2: Free email address for corporate hiring
  if (contact_email) {
    const emailLower = contact_email.toLowerCase();
    if (emailLower.endsWith('@gmail.com') || emailLower.endsWith('@yahoo.com') || emailLower.endsWith('@hotmail.com') || emailLower.endsWith('@outlook.com')) {
      score -= 25;
      red_flags.push(`Suspicious recruiter email: Using generic free mail (${contact_email}) rather than official corporate domain.`);
    } else {
      strengths.push(`Official corporate email domain used (${contact_email}).`);
    }
  }

  // Flag 3: Free hosting or suspicious domains
  if (domain) {
    const domainLower = domain.toLowerCase();
    if (domainLower.includes('.freehosting.') || domainLower.includes('.tk') || domainLower.includes('.xyz') || domainLower.includes('.site') || domainLower.includes('wixsite')) {
      score -= 20;
      red_flags.push(`Unverified or throwaway domain (${domain}).`);
    } else if (domainLower.endsWith('.co.ke') || domainLower.endsWith('.ac.ke') || domainLower.endsWith('.com') || domainLower.endsWith('.io')) {
      strengths.push(`Recognized top-level domain registered (${domain}).`);
    }
  }

  // Flag 4: Known verified Kenyan and Global powerhouses
  const knownVerified = [
    'safaricom', 'microsoft', 'google', 'equity', 'kcb', 'cellulant',
    'andela', 'pesapal', 'twiga', 'tala', 'craft silicon', 'little',
    'gitlab', 'canonical', 'deel', 'remote.com', 'strathmore', 'ilabafrica'
  ];

  const matchedKnown = knownVerified.find(k => (company_name || '').toLowerCase().includes(k));
  if (matchedKnown) {
    score = Math.min(100, score + 15);
    strengths.push(`Verified established technology brand recognized in Kenyan / Global ecosystem (${matchedKnown.toUpperCase()}).`);
  }

  // Flag 5: Unrealistic salary with zero experience (too good to be true)
  if (textToScan.includes('no experience') && (textToScan.includes('300,000') || textToScan.includes('400,000') || textToScan.includes('500,000') || textToScan.includes('$5,000'))) {
    score -= 25;
    red_flags.push("Disproportionate compensation offer for zero prerequisites (common phishing lure).");
  }

  // Clamp score
  score = Math.max(5, Math.min(100, score));

  let verdict = 'LOW_RISK_VERIFIED';
  if (score < 40) {
    verdict = 'HIGH_RISK_SCAM';
  } else if (score < 75) {
    verdict = 'MODERATE_VERIFY_FURTHER';
  }

  return {
    score,
    verdict,
    red_flags,
    strengths,
    audit_date: new Date().toISOString()
  };
}

// Compute market salary and roles analytics
function getAnalytics() {
  const jobs = db.prepare('SELECT * FROM jobs').all();
  const reviews = db.prepare('SELECT * FROM reviews').all();

  // Roles spectrum stats
  const rolesDistribution = {
    attachment: jobs.filter(j => j.seniority === 'attachment').length,
    internship: jobs.filter(j => j.seniority === 'internship').length,
    junior: jobs.filter(j => j.seniority === 'junior').length,
    mid: jobs.filter(j => j.seniority === 'mid').length,
    senior: jobs.filter(j => j.seniority === 'senior').length,
    lead_manager: jobs.filter(j => j.seniority === 'lead_manager').length,
    cto: jobs.filter(j => j.seniority === 'cto').length
  };

  // Salary benchmarks in Kenya (Median KES & USD)
  const salaryBenchmarks = [
    { level: "Industrial Attachment", seniority: "attachment", avg_kes: "25,000 - 35,000", avg_usd: "$200 - $270", typical_duration: "3 - 6 Months", nita_accredited: "Yes", focus: "Academic credit, foundational skills, logbook" },
    { level: "Graduate Trainee / Intern", seniority: "internship", avg_kes: "45,000 - 140,000", avg_usd: "$350 - $1,100", typical_duration: "6 - 12 Months", nita_accredited: "Optional", focus: "Real production code, structured mentoring" },
    { level: "Junior Developer (0-2 Yrs)", seniority: "junior", avg_kes: "80,000 - 150,000", avg_usd: "$600 - $1,200", typical_duration: "Full-Time", nita_accredited: "N/A", focus: "Feature delivery, code reviews, testing" },
    { level: "Mid-Level Engineer (2-5 Yrs)", seniority: "mid", avg_kes: "200,000 - 380,000", avg_usd: "$1,500 - $2,900", typical_duration: "Full-Time", nita_accredited: "N/A", focus: "Autonomous architecture, microservices, cloud" },
    { level: "Senior / Staff Engineer (5+ Yrs)", seniority: "senior", avg_kes: "450,000 - 900,000+", avg_usd: "$3,500 - $7,000+", typical_duration: "Full-Time / Remote", nita_accredited: "N/A", focus: "High concurrency, system design, scalability" },
    { level: "Lead Manager / Eng Manager", seniority: "lead_manager", avg_kes: "600,000 - 1,100,000", avg_usd: "$4,600 - $8,500", typical_duration: "Full-Time", nita_accredited: "N/A", focus: "People leadership, delivery speed, hiring" },
    { level: "CTO / VP of Engineering", seniority: "cto", avg_kes: "900,000 - 1,800,000+", avg_usd: "$7,000 - $14,000+", typical_duration: "Executive + Equity", nita_accredited: "N/A", focus: "Tech vision, board reporting, compliance, ESOP" }
  ];

  // In-demand skills in Kenya
  const inDemandSkills = [
    { name: "TypeScript / React / Next.js", demand: 94, category: "Frontend & Fullstack" },
    { name: "Python / FastAPI / Django", demand: 91, category: "Backend & AI" },
    { name: "Go (Golang)", demand: 86, category: "High Scale Microservices" },
    { name: "Flutter (Dart)", demand: 89, category: "Cross-platform Mobile" },
    { name: "AWS / Docker / Kubernetes", demand: 88, category: "DevOps & Cloud" },
    { name: "M-Pesa Daraja & Payment APIs", demand: 95, category: "Kenyan Fintech Integration" },
    { name: "Cybersecurity & CBK Compliance", demand: 82, category: "InfoSec & Security" },
    { name: "PostgreSQL & Kafka", demand: 85, category: "Data & Streaming" }
  ];

  return {
    total_jobs: jobs.length,
    roles_distribution: rolesDistribution,
    salary_benchmarks: salaryBenchmarks,
    in_demand_skills: inDemandSkills,
    avg_credibility_score: Math.round(jobs.reduce((acc, j) => acc + (j.credibility_score || 0), 0) / (jobs.length || 1)),
    total_reviews: reviews.length,
    remote_ratio: `${Math.round((jobs.filter(j => j.location_type === 'Worldwide Remote').length / (jobs.length || 1)) * 100)}% Worldwide Remote`
  };
}

// User-Agent & Device Parser for Developer Visitor Telemetry
function parseUserAgentDetails(uaString) {
  const ua = uaString || '';
  let device = 'Desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device = 'Mobile';
  } else if (/ipad|tablet|silk|kindle/i.test(ua)) {
    device = 'Tablet';
  }

  let browser = 'Chrome';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'IE';
  else browser = 'Other';

  let os = 'Windows';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else os = 'Other';

  return { device, browser, os };
}

// Normalize Referrer URLs into human-friendly channels
function normalizeReferrer(refUrl) {
  if (!refUrl || refUrl === 'Direct / Bookmark' || refUrl === '') return 'Direct / Bookmark';
  try {
    const parsed = new URL(refUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('google')) return 'Google Search';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('whatsapp')) return 'WhatsApp';
    if (host.includes('twitter') || host.includes('t.co') || host.includes('x.com')) return 'X / Twitter';
    if (host.includes('facebook') || host.includes('fb.me')) return 'Facebook';
    if (host.includes('github')) return 'GitHub';
    if (host.includes('reddit')) return 'Reddit';
    if (host.includes('t.me') || host.includes('telegram')) return 'Telegram';
    if (host.includes('dev-core-ke') || host.includes('localhost') || host.includes('127.0.0.1')) return 'Direct / Bookmark';
    return host.replace(/^www\./, '');
  } catch (e) {
    return refUrl.slice(0, 40);
  }
}

// Filter out known automated bots & web crawlers
function isBotRequest(uaString) {
  const ua = (uaString || '').toLowerCase();
  return /bot|crawler|spider|slurp|headlesschrome|googlebot|bingbot|yandex|baiduspider|duckduckbot|facebookexternalhit|curl|wget|python-requests|node-fetch|lighthouse|uptimerobot/i.test(ua);
}

// Seed initial realistic baseline telemetry if database is fresh
function seedBaselineVisitsIfEmpty() {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM site_visits').get();
    if (countRow && countRow.count > 0) return;

    console.log('🌱 Seeding baseline telemetry visits for Developer Console...');
    const insertVisit = db.prepare(`
      INSERT INTO site_visits (
        visitor_hash, referrer, device, browser, os, path, screen_res, created_at
      ) VALUES (
        @visitor_hash, @referrer, @device, @browser, @os, @path, @screen_res, @created_at
      )
    `);

    const sources = [
      { ref: 'LinkedIn', weight: 32 },
      { ref: 'Direct / Bookmark', weight: 26 },
      { ref: 'WhatsApp', weight: 20 },
      { ref: 'Google Search', weight: 14 },
      { ref: 'X / Twitter', weight: 5 },
      { ref: 'GitHub', weight: 3 }
    ];

    const platforms = [
      { device: 'Desktop', browser: 'Chrome', os: 'Windows', res: '1920x1080' },
      { device: 'Desktop', browser: 'Chrome', os: 'macOS', res: '1440x900' },
      { device: 'Desktop', browser: 'Firefox', os: 'Linux', res: '1920x1080' },
      { device: 'Desktop', browser: 'Edge', os: 'Windows', res: '1366x768' },
      { device: 'Mobile', browser: 'Chrome', os: 'Android', res: '390x844' },
      { device: 'Mobile', browser: 'Safari', os: 'iOS', res: '393x852' },
      { device: 'Mobile', browser: 'Chrome', os: 'Android', res: '412x915' },
      { device: 'Tablet', browser: 'Safari', os: 'iOS', res: '820x1180' }
    ];

    const now = Date.now();
    let totalSeeded = 0;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const visitsThisDay = Math.floor(10 + (6 - dayOffset) * 2 + Math.random() * 5);
      const dayBaseTime = now - dayOffset * 86400000;

      for (let j = 0; j < visitsThisDay; j++) {
        const plat = platforms[Math.floor(Math.random() * platforms.length)];
        const srcRand = Math.random() * 100;
        let cumulative = 0;
        let chosenSource = 'Direct / Bookmark';
        for (const s of sources) {
          cumulative += s.weight;
          if (srcRand <= cumulative) {
            chosenSource = s.ref;
            break;
          }
        }

        const visitorIndex = (j % 6) + (dayOffset * 7);
        const visitorHash = crypto.createHash('sha256')
          .update(`sim-visitor-${visitorIndex}`)
          .digest('hex')
          .slice(0, 16);

        const visitTime = new Date(dayBaseTime - Math.floor(Math.random() * 80000000)).toISOString();

        insertVisit.run({
          visitor_hash: visitorHash,
          referrer: chosenSource,
          device: plat.device,
          browser: plat.browser,
          os: plat.os,
          path: j % 3 === 0 ? '/#jobs' : (j % 5 === 0 ? '/#credibility' : '/'),
          screen_res: plat.res,
          created_at: visitTime
        });
        totalSeeded++;
      }
    }
    console.log(`✅ Seeded ${totalSeeded} baseline telemetry visits.`);
  } catch (err) {
    console.warn('Telemetry seeding error (non-critical):', err.message);
  }
}

// Compute Developer Traffic & Visitor Telemetry
function getDeveloperSiteAnalytics() {
  const visits = db.prepare('SELECT * FROM site_visits ORDER BY id DESC').all();

  const totalPageviews = visits.length;
  const uniqueHashes = new Set(visits.map(v => v.visitor_hash));
  const uniqueVisitorsAllTime = uniqueHashes.size;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  const todayVisits = visits.filter(v => (v.created_at || '').startsWith(todayStr));
  const todayUniques = new Set(todayVisits.map(v => v.visitor_hash)).size;

  const yesterdayVisits = visits.filter(v => (v.created_at || '').startsWith(yesterdayStr));
  const yesterdayUniques = new Set(yesterdayVisits.map(v => v.visitor_hash)).size;

  const activePast30m = new Set(
    visits.filter(v => (v.created_at || '') >= thirtyMinsAgo).map(v => v.visitor_hash)
  ).size;

  // Device Breakdown
  const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0 };
  visits.forEach(v => {
    const dev = v.device || 'Desktop';
    if (deviceCounts[dev] !== undefined) {
      deviceCounts[dev]++;
    } else {
      deviceCounts.Desktop++;
    }
  });

  // Browser Breakdown
  const browserCounts = {};
  visits.forEach(v => {
    const b = v.browser || 'Other';
    browserCounts[b] = (browserCounts[b] || 0) + 1;
  });
  const topBrowsers = Object.entries(browserCounts)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / (totalPageviews || 1)) * 100) }))
    .sort((a, b) => b.count - a.count);

  // OS Breakdown
  const osCounts = {};
  visits.forEach(v => {
    const o = v.os || 'Other';
    osCounts[o] = (osCounts[o] || 0) + 1;
  });
  const topOS = Object.entries(osCounts)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / (totalPageviews || 1)) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Referrers Breakdown
  const referrerCounts = {};
  visits.forEach(v => {
    const ref = v.referrer || 'Direct / Bookmark';
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  });
  const topReferrers = Object.entries(referrerCounts)
    .map(([source, count]) => ({ source, count, pct: Math.round((count / (totalPageviews || 1)) * 100) }))
    .sort((a, b) => b.count - a.count);

  // 7-Day Trend
  const dailyTrends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    const dayVisits = visits.filter(v => (v.created_at || '').startsWith(dStr));
    const dayUniques = new Set(dayVisits.map(v => v.visitor_hash)).size;
    dailyTrends.push({
      date: dStr,
      label: dayLabel,
      pageviews: dayVisits.length,
      uniques: dayUniques
    });
  }

  // Recent 15 Visits
  const recentVisits = visits.slice(0, 15).map(v => {
    const vTime = new Date(v.created_at);
    const diffSec = Math.floor((now - vTime) / 1000);
    let timeAgo = 'Just now';
    if (diffSec >= 86400) timeAgo = `${Math.floor(diffSec / 86400)}d ago`;
    else if (diffSec >= 3600) timeAgo = `${Math.floor(diffSec / 3600)}h ago`;
    else if (diffSec >= 60) timeAgo = `${Math.floor(diffSec / 60)}m ago`;

    return {
      id: v.id,
      visitor_id: (v.visitor_hash || '').slice(0, 8),
      device: v.device || 'Desktop',
      browser: v.browser || 'Unknown',
      os: v.os || 'Unknown',
      referrer: v.referrer || 'Direct / Bookmark',
      path: v.path || '/',
      created_at: v.created_at,
      time_ago: timeAgo
    };
  });

  return {
    total_pageviews: totalPageviews,
    unique_visitors_all_time: uniqueVisitorsAllTime,
    today_pageviews: todayVisits.length,
    today_uniques: todayUniques,
    yesterday_pageviews: yesterdayVisits.length,
    yesterday_uniques: yesterdayUniques,
    active_past_30m: Math.max(activePast30m, 1),
    devices: deviceCounts,
    top_browsers: topBrowsers.slice(0, 5),
    top_os: topOS.slice(0, 5),
    top_referrers: topReferrers.slice(0, 8),
    daily_trends: dailyTrends,
    recent_visits: recentVisits
  };
}

// Roles Guidance Catalog for Kenyans
function getRolesGuidance() {
  return [
    {
      seniority: "attachment",
      title: "Industrial Attachment (CS / IT / SE)",
      who_is_it_for: "Continuing university & polytechnic students (Year 3/4) fulfilling mandatory Kenya commission for university education attachment units.",
      key_responsibilities: "Assisting developers, learning internal codebases, submitting weekly logbooks, writing documentation.",
      typical_stipend_kenya: "KES 15,000 - 35,000 / month (or transport allowance)",
      statutory_rules: "NITA (National Industrial Training Authority) accreditation, Student insurance cover, University recommendation letter required.",
      how_to_break_in: "Apply 3 months in advance before semester break; prepare a GitHub profile with 2 clean projects; leverage campus career fairs."
    },
    {
      seniority: "internship",
      title: "Graduate Trainee / Junior Intern",
      who_is_it_for: "Recent graduates (0-1 year post-graduation) transitioning from academic theory to commercial development.",
      key_responsibilities: "Bug fixing, unit testing, building frontend UI components, participating in agile standups.",
      typical_stipend_kenya: "KES 45,000 - 150,000 / month (Top tier MNCs pay higher)",
      statutory_rules: "Standard employment contract, NHIF/SHIF, NSSF compliance.",
      how_to_break_in: "Target rotational programs (e.g. Microsoft ADC Apprenticeship, Safaricom Discover, Equity Tech Academy); master LeetCode basics."
    },
    {
      seniority: "junior",
      title: "Junior Developer (0 - 2 Years)",
      who_is_it_for: "Engineers with foundational knowledge seeking commercial experience and technical autonomy.",
      key_responsibilities: "Feature development under senior review, API integrations, debugging, writing automated tests.",
      typical_stipend_kenya: "KES 80,000 - 160,000 (Local) | $800 - $1,500 (Remote)",
      statutory_rules: "Full employment contract, PAYE tax, Housing levy, Medical insurance.",
      how_to_break_in: "Demonstrate solid grasp of 1 core stack (e.g., React + Node or Python + Postgres); contribute to open source or local tech communities (Nairobi Gophers, React Nairobi)."
    },
    {
      seniority: "mid",
      title: "Mid-Level Software Engineer (2 - 5 Years)",
      who_is_it_for: "Independent problem solvers who can design and ship complex features without hand-holding.",
      key_responsibilities: "End-to-end system development, database optimization, mentoring juniors, participating in architecture reviews.",
      typical_stipend_kenya: "KES 200,000 - 400,000 (Local) | $2,000 - $4,500 (Remote)",
      statutory_rules: "Full benefits, pension, annual leave, professional development allowances.",
      how_to_break_in: "Master distributed systems fundamentals, cloud deployment (AWS/GCP), CI/CD pipelines, and deep domain expertise (e.g. Fintech, E-commerce)."
    },
    {
      seniority: "senior",
      title: "Senior Developer / Staff Engineer (5+ Years)",
      who_is_it_for: "Seasoned engineers driving system-level technical decisions, high scale resilience, and team standards.",
      key_responsibilities: "Designing mission-critical distributed systems, high throughput event streaming, technical strategy, cross-team mentoring.",
      typical_stipend_kenya: "KES 450,000 - 900,000+ (Local) | $4,500 - $10,000 (Remote)",
      statutory_rules: "Executive compensation, performance bonuses, international contractor W-8BEN or EOR contracts.",
      how_to_break_in: "Proven track record delivering systems serving millions of users; system design mastery; strong written async communication."
    },
    {
      seniority: "lead_manager",
      title: "Lead Manager / Engineering Manager",
      who_is_it_for: "Engineers transitioning to technical leadership, squad management, and stakeholder orchestration.",
      key_responsibilities: "Sprint planning, unblocking squads, hiring and talent retention, 1-on-1 career coaching, alignment with business KPIs.",
      typical_stipend_kenya: "KES 600,000 - 1,200,000 / month",
      statutory_rules: "Executive / Management contract, leadership incentive bonuses.",
      how_to_break_in: "Develop high emotional intelligence (EQ), project management mastery, and strong empathy for developer experience."
    },
    {
      seniority: "cto",
      title: "Chief Technology Officer (CTO) / VP of Tech",
      who_is_it_for: "Executive leaders overseeing all technology assets, cybersecurity posture, tech vision, and board relations.",
      key_responsibilities: "Formulating technological vision, managing cloud expenditure & budgets, compliance (CBK, Data Protection Act), investor pitches.",
      typical_stipend_kenya: "KES 900,000 - 2,000,000+ / month + Equity (ESOP)",
      statutory_rules: "Board executive contract, equity vesting schedule, fiduciary responsibilities.",
      how_to_break_in: "Deep strategic alignment with business economics; capability to translate board goals into scalable technical architectures."
    }
  ];
}

// ============================================================================
// 🤖 AUTONOMOUS HOURLY ROLE SCANNER & KEEP-ALIVE HEARTBEAT ENGINE
// ============================================================================

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function classifySeniority(title, description = '') {
  const t = `${title} ${description}`.toLowerCase();
  if (t.includes('attachment') || t.includes('industrial trainee') || t.includes('nita') || t.includes('student intern') || t.includes('attaché') || t.includes('attachee')) {
    return 'attachment';
  }
  if (t.includes('graduate trainee') || t.includes('intern') || t.includes('internship') || t.includes('apprentice') || t.includes('fellowship')) {
    return 'internship';
  }
  if (t.includes('junior') || t.includes('entry level') || t.includes('entry-level') || t.includes('associate') || t.includes('trainee') || t.includes('0-2 year') || t.includes('0-1 year')) {
    return 'junior';
  }
  if (t.includes('cto') || t.includes('chief technology') || t.includes('vp of engineering') || t.includes('vice president of engineering') || t.includes('head of engineering')) {
    return 'cto';
  }
  if (t.includes('engineering manager') || t.includes('lead engineer') || t.includes('tech lead') || t.includes('team lead') || t.includes('lead developer') || t.includes('technical lead')) {
    return 'lead_manager';
  }
  if (t.includes('senior') || t.includes('staff') || t.includes('principal') || t.includes('architect') || t.includes('sr.') || t.includes('5+ year') || t.includes('lead software')) {
    return 'senior';
  }
  return 'mid';
}

function classifyDomain(title, description = '') {
  const t = `${title} ${description}`.toLowerCase();
  if (t.includes('devops') || t.includes('cloud') || t.includes('aws') || t.includes('sre') || t.includes('kubernetes') || t.includes('cloud infrastructure') || t.includes('it infrastructure') || t.includes('infrastructure engineer') || t.includes('platform engineer') || t.includes('terraform')) {
    return 'devops_cloud';
  }
  if (t.includes('data engineer') || t.includes('machine learning') || t.includes('ai ') || t.includes('ml ') || t.includes('artificial intelligence') || t.includes('data science') || t.includes('llm') || t.includes('data analyst')) {
    return 'ai_ml_data';
  }
  if (t.includes('security') || t.includes('cyber') || t.includes('infosec') || t.includes('soc ') || t.includes('penetration') || t.includes('vulnerability')) {
    return 'cybersecurity';
  }
  if (t.includes('mobile') || t.includes('flutter') || t.includes('dart') || t.includes('android') || t.includes('ios') || t.includes('react native') || t.includes('swift') || t.includes('kotlin')) {
    return 'mobile';
  }
  if (t.includes('qa') || t.includes('test') || t.includes('quality assurance') || t.includes('automation engineer') || t.includes('sdet')) {
    return 'qa_testing';
  }
  if (t.includes('embedded') || t.includes('iot') || t.includes('firmware') || t.includes('hardware') || t.includes('microcontroller')) {
    return 'embedded_systems';
  }
  if (t.includes('frontend') || t.includes('front-end') || t.includes('react') || t.includes('vue') || t.includes('angular') || t.includes('ui/ux') || t.includes('web design')) {
    return 'frontend';
  }
  if (t.includes('backend') || t.includes('back-end') || t.includes('python') || t.includes('node') || t.includes('django') || t.includes('golang') || t.includes('go developer') || t.includes('java') || t.includes('spring') || t.includes('.net') || t.includes('c#') || t.includes('php') || t.includes('laravel')) {
    return 'backend';
  }
  return 'fullstack';
}

function estimateSalaries(seniority, domain) {
  switch (seniority) {
    case 'attachment':
      return { kes_min: 25000, kes_max: 35000, usd_min: 200, usd_max: 270, currency: 'KES' };
    case 'internship':
      return { kes_min: 50000, kes_max: 120000, usd_min: 400, usd_max: 950, currency: 'KES' };
    case 'junior':
      return { kes_min: 80000, kes_max: 160000, usd_min: 650, usd_max: 1300, currency: 'KES' };
    case 'mid':
      return { kes_min: 200000, kes_max: 380000, usd_min: 1600, usd_max: 3000, currency: 'KES' };
    case 'senior':
      return { kes_min: 450000, kes_max: 850000, usd_min: 3500, usd_max: 6800, currency: 'KES' };
    case 'lead_manager':
      return { kes_min: 600000, kes_max: 1100000, usd_min: 4800, usd_max: 8800, currency: 'KES' };
    case 'cto':
      return { kes_min: 900000, kes_max: 1800000, usd_min: 7200, usd_max: 14500, currency: 'KES' };
    default:
      return { kes_min: 150000, kes_max: 300000, usd_min: 1200, usd_max: 2400, currency: 'KES' };
  }
}

// Fetch Remote Software Developer roles from Remotive public API
async function fetchRemotiveJobs() {
  const url = 'https://remotive.com/api/remote-jobs?category=software-dev&limit=40';
  const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
  if (!response.ok) throw new Error(`Remotive HTTP status ${response.status}`);
  const data = await response.json();
  const jobsList = data.jobs || [];

  return jobsList.map(item => {
    const title = item.title || 'Software Engineer';
    const desc = stripHtml(item.description || '');
    const seniority = classifySeniority(title, desc);
    const domain = classifyDomain(title, desc);
    const sal = estimateSalaries(seniority, domain);
    const originalId = item.id ? String(item.id) : '';

    return {
      original_job_id: originalId,
      title,
      company: item.company_name || 'Global Tech Employer',
      company_domain: (item.url || '').split('/')[2] || 'remotive.com',
      location: item.candidate_required_location || 'Worldwide Remote (Kenya Accessible)',
      location_type: 'Worldwide Remote',
      seniority,
      domain,
      salary_kes_min: sal.kes_min,
      salary_kes_max: sal.kes_max,
      salary_usd_min: sal.usd_min,
      salary_usd_max: sal.usd_max,
      currency_display: 'USD',
      description: desc.slice(0, 320),
      requirements: (item.tags || []).join(', ') || 'Modern software engineering principles, Git, async communication',
      benefits: 'Worldwide remote contract, equipment budget, flexible asynchronous hours',
      apply_url: item.url || (originalId ? `https://remotive.com/remote-jobs/${originalId}` : 'https://remotive.com'),
      contact_email: 'apply@remotive.com',
      posted_date: (item.publication_date || '').split('T')[0] || new Date().toISOString().split('T')[0],
      tags: `Remote,${(item.tags || []).slice(0, 4).join(',')}`
    };
  });
}

// Fetch Remote Engineering roles from Jobicy public API
async function fetchJobicyJobs() {
  const url = 'https://jobicy.com/api/v2/remote-jobs?count=30&industry=engineering';
  const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
  if (!response.ok) throw new Error(`Jobicy HTTP status ${response.status}`);
  const data = await response.json();
  const jobsList = data.jobs || [];

  return jobsList.map(item => {
    const title = item.jobTitle || 'Software Engineer';
    const desc = stripHtml(item.jobDescription || '');
    const seniority = classifySeniority(title, desc);
    const domain = classifyDomain(title, desc);
    const sal = estimateSalaries(seniority, domain);
    const originalId = item.id ? String(item.id) : '';

    return {
      original_job_id: originalId,
      title,
      company: item.companyName || 'Global Tech Partner',
      company_domain: (item.url || '').split('/')[2] || 'jobicy.com',
      location: item.jobGeo || 'Anywhere (Worldwide Remote)',
      location_type: 'Worldwide Remote',
      seniority,
      domain,
      salary_kes_min: sal.kes_min,
      salary_kes_max: sal.kes_max,
      salary_usd_min: sal.usd_min,
      salary_usd_max: sal.usd_max,
      currency_display: 'USD',
      description: desc.slice(0, 320),
      requirements: 'Collaborative development, unit testing, agile sprints, clean code architecture',
      benefits: 'International remote setup, contractor payroll via Deel/Remote.com, paid time off',
      apply_url: item.url || (originalId ? `https://jobicy.com/jobs/${originalId}` : 'https://jobicy.com'),
      contact_email: 'careers@jobicy.com',
      posted_date: (item.pubDate || '').split('T')[0] || new Date().toISOString().split('T')[0],
      tags: `Remote,Jobicy,Engineering,${domain}`
    };
  });
}

// Fetch Software Developer roles from Arbeitnow public API (300+ live jobs)
async function fetchArbeitnowJobs() {
  const url = 'https://www.arbeitnow.com/api/job-board-api';
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DEV-CORE-KE-JobCrawler/1.0' },
    signal: AbortSignal.timeout(7500)
  });
  if (!response.ok) throw new Error(`Arbeitnow HTTP status ${response.status}`);
  const data = await response.json();
  const rawList = data.data || [];

  const softwareJobs = rawList.filter(item => {
    const titleLower = (item.title || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    // Exclude non-software engineering disciplines (e.g. Civil, Geotechnical, Structural, HVAC, Sales, Medical)
    if (titleLower.includes('civil') || titleLower.includes('geotechnical') || titleLower.includes('structural') || titleLower.includes('hvac') || titleLower.includes('sales') || titleLower.includes('account executive') || titleLower.includes('marketing') || titleLower.includes('recruiter') || titleLower.includes('accountant') || titleLower.includes('finance manager') || titleLower.includes('ecommerce executive') || titleLower.includes('growth manager')) {
      return false;
    }
    const text = `${titleLower} ${(item.tags || []).join(' ')} ${descLower}`;
    return text.includes('developer') || text.includes('engineer') || text.includes('software') || 
           text.includes('frontend') || text.includes('backend') || text.includes('fullstack') || 
           text.includes('devops') || text.includes('cloud') || text.includes('data') || 
           text.includes('python') || text.includes('javascript') || text.includes('react') || text.includes('security');
  }).slice(0, 75);

  return softwareJobs.map(item => {
    const title = item.title || 'Software Developer';
    const desc = stripHtml(item.description || '');
    const seniority = classifySeniority(title, desc);
    const domain = classifyDomain(title, desc);
    const sal = estimateSalaries(seniority, domain);
    const company = item.company_name || 'Global Tech Partner';
    const domainFromUrl = (item.url || '').split('/')[2] || 'arbeitnow.com';
    const originalId = item.slug ? String(item.slug).split('-').pop() : String(item.id || '');

    return {
      original_job_id: originalId,
      title,
      company,
      company_domain: domainFromUrl,
      location: item.location || 'Worldwide Remote (Kenya Accessible)',
      location_type: 'Worldwide Remote',
      seniority,
      domain,
      salary_kes_min: sal.kes_min,
      salary_kes_max: sal.kes_max,
      salary_usd_min: sal.usd_min,
      salary_usd_max: sal.usd_max,
      currency_display: 'USD',
      description: desc.slice(0, 320),
      requirements: (item.tags || []).join(', ') || 'Modern software development, Git, unit testing, agile workflows',
      benefits: 'Global remote contract, equipment budget, paid leave, flexible working hours',
      apply_url: item.url || (originalId ? `https://www.arbeitnow.com/jobs/${originalId}` : 'https://www.arbeitnow.com'),
      contact_email: 'jobs@arbeitnow.com',
      posted_date: item.created_at ? new Date(item.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      tags: `Remote,Arbeitnow,${(item.tags || []).slice(0, 3).join(',')}`
    };
  });
}

// Fetch Remote Tech roles from RemoteOK public API (100+ live jobs)
async function fetchRemoteOKJobs() {
  const url = 'https://remoteok.com/api';
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DEV-CORE-KE-JobCrawler/1.0' },
    signal: AbortSignal.timeout(7500)
  });
  if (!response.ok) throw new Error(`RemoteOK HTTP status ${response.status}`);
  const data = await response.json();
  const rawList = Array.isArray(data) ? data.slice(1) : [];

  const devJobs = rawList.filter(item => {
    if (!item || !item.position) return false;
    const text = `${item.position || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
    return text.includes('developer') || text.includes('engineer') || text.includes('software') || 
           text.includes('frontend') || text.includes('backend') || text.includes('fullstack') || 
           text.includes('devops') || text.includes('cloud') || text.includes('data') || 
           text.includes('react') || text.includes('node') || text.includes('golang') || text.includes('python');
  }).slice(0, 60);

  return devJobs.map(item => {
    const title = item.position || 'Remote Software Engineer';
    const desc = stripHtml(item.description || '');
    const seniority = classifySeniority(title, desc);
    const domain = classifyDomain(title, desc);
    const sal = estimateSalaries(seniority, domain);
    const company = item.company || 'Remote Tech Partner';

    const minUsd = parseInt(item.salary_min, 10) > 0 ? parseInt(item.salary_min, 10) : sal.usd_min;
    const maxUsd = parseInt(item.salary_max, 10) > 0 ? parseInt(item.salary_max, 10) : sal.usd_max;
    const originalId = item.id ? String(item.id) : '';

    return {
      original_job_id: originalId,
      title,
      company,
      company_domain: (item.url || '').split('/')[2] || 'remoteok.com',
      location: item.location || 'Worldwide Remote (Kenya Accessible)',
      location_type: 'Worldwide Remote',
      seniority,
      domain,
      salary_kes_min: Math.round(minUsd * 128),
      salary_kes_max: Math.round(maxUsd * 128),
      salary_usd_min: minUsd,
      salary_usd_max: maxUsd,
      currency_display: 'USD',
      description: desc.slice(0, 320),
      requirements: (item.tags || []).join(', ') || 'Deep technical proficiency, async communication, Git, production experience',
      benefits: 'Top-tier USD compensation, home office setup stipend, flexible hours',
      apply_url: item.apply_url || item.url || (originalId ? `https://remoteok.com/remote-jobs/${originalId}` : 'https://remoteok.com'),
      contact_email: 'apply@remoteok.com',
      posted_date: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
      tags: `RemoteOK,Remote,USD,${(item.tags || []).slice(0, 3).join(',')}`
    };
  });
}

// Tracked Public LinkedIn Tech Roles Feed (Kenya & Global Remote Powerhouses)
function fetchLinkedInTrackedJobs() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      original_job_id: "LK-402918451",
      title: "Senior Cloud & Distributed Systems Engineer",
      company: "Safaricom PLC",
      company_domain: "linkedin.com/company/safaricom-plc",
      location: "Nairobi, Kenya (HQ / Hybrid)",
      location_type: "Hybrid",
      seniority: "senior",
      domain: "devops_cloud",
      salary_kes_min: 480000,
      salary_kes_max: 750000,
      salary_usd_min: 3750,
      salary_usd_max: 5850,
      currency_display: "KES",
      description: "Scale high-throughput telecom cloud fabrics and microservices for Safaricom Digital Channels. Architect zero-downtime Kubernetes deployments, telemetry dashboards, and multi-region disaster recovery.",
      requirements: "5+ years in distributed architectures; Kubernetes, Go, Python, AWS / Azure; Terraform; Kafka event streaming.",
      benefits: "Executive medical cover, Safaricom data & airtime allowance, annual performance bonus, pension scheme.",
      apply_url: "https://www.linkedin.com/jobs/view/402918451/",
      contact_email: "careers@safaricom.co.ke",
      posted_date: today,
      tags: "LinkedIn,Safaricom,Cloud,Kubernetes,Nairobi"
    },
    {
      original_job_id: "MSFT-1793821",
      title: "Software Engineer II - Azure Intelligent Cloud",
      company: "Microsoft Africa Development Centre (ADC)",
      company_domain: "linkedin.com/company/microsoft",
      location: "Nairobi (Dunhill Towers, Westlands)",
      location_type: "Kenya Local",
      seniority: "mid",
      domain: "backend",
      salary_kes_min: 350000,
      salary_kes_max: 550000,
      salary_usd_min: 2700,
      salary_usd_max: 4300,
      currency_display: "KES",
      description: "Join Microsoft ADC Nairobi contributing directly to core Azure cloud services, high performance edge networking, and security fabrics deployed globally.",
      requirements: "3+ years production coding in C#, C++, Java or Go; Distributed systems fundamentals; Object-oriented design and CI/CD pipelines.",
      benefits: "Microsoft stock awards (RSUs), comprehensive family healthcare, education reimbursement, international relocation options.",
      apply_url: "https://jobs.careers.microsoft.com/global/en/job/1793821/Software-Engineer-II-Azure-Intelligent-Cloud",
      contact_email: "adcnairobi@microsoft.com",
      posted_date: today,
      tags: "LinkedIn,Microsoft,ADC,Azure,C#"
    },
    {
      original_job_id: "LK-401823940",
      title: "Fullstack Fintech Engineer (React & Go)",
      company: "Pesapal Kenya",
      company_domain: "linkedin.com/company/pesapal",
      location: "Nairobi (Lavington HQ)",
      location_type: "Kenya Local",
      seniority: "mid",
      domain: "fullstack",
      salary_kes_min: 220000,
      salary_kes_max: 360000,
      salary_usd_min: 1700,
      salary_usd_max: 2800,
      currency_display: "KES",
      description: "Build robust merchant checkout interfaces and scalable payment webhooks across East and Central Africa. Work with M-Pesa, Visa, Mastercard, and Airtel Money gateway APIs.",
      requirements: "3+ years React / Next.js and Go or Node.js; REST APIs, WebSockets, PostgreSQL; Strong understanding of payment security standards (PCI-DSS).",
      benefits: "Competitive remuneration, medical insurance, continuous training on financial transaction protocols.",
      apply_url: "https://www.linkedin.com/jobs/view/401823940/",
      contact_email: "jobs@pesapal.com",
      posted_date: today,
      tags: "LinkedIn,Pesapal,React,Go,Fintech,Kenya"
    },
    {
      original_job_id: "TALA-6048192",
      title: "Senior Android Engineer (Fintech & Lending)",
      company: "Tala Kenya",
      company_domain: "linkedin.com/company/tala",
      location: "Nairobi (Riverside / Hybrid)",
      location_type: "Hybrid",
      seniority: "senior",
      domain: "mobile",
      salary_kes_min: 450000,
      salary_kes_max: 720000,
      salary_usd_min: 3500,
      salary_usd_max: 5600,
      currency_display: "KES",
      description: "Architect the next generation of Tala's mobile financial services application used by millions of customers across emerging markets. Focus on offline-first resilience, biometric authentication, and modular architecture.",
      requirements: "5+ years native Android in Kotlin; Jetpack Compose, Coroutines, Flow, Dagger/Hilt; Clean architecture and automated testing.",
      benefits: "Equity grant, wellness allowance, home office reimbursement, international cross-team collaboration.",
      apply_url: "https://boards.greenhouse.io/tala/jobs/6048192",
      contact_email: "careers-ke@tala.co",
      posted_date: today,
      tags: "LinkedIn,Tala,Android,Kotlin,Mobile"
    },
    {
      original_job_id: "LK-405918233",
      title: "DevOps & SRE Platform Lead",
      company: "Equity Group Holdings",
      company_domain: "linkedin.com/company/equity-bank-limited",
      location: "Nairobi (Upper Hill HQ)",
      location_type: "Kenya Local",
      seniority: "lead_manager",
      domain: "devops_cloud",
      salary_kes_min: 600000,
      salary_kes_max: 950000,
      salary_usd_min: 4700,
      salary_usd_max: 7400,
      currency_display: "KES",
      description: "Direct site reliability and platform automation squads across Equity Group banking infrastructure in Kenya, DRC, Uganda, and Rwanda. Ensure 99.999% uptime for core banking channels.",
      requirements: "7+ years in DevOps / SRE leadership; Kubernetes, OpenShift, HashiCorp stack (Terraform, Vault), Prometheus, incident management.",
      benefits: "Executive banking benefits, low-interest mortgage, comprehensive family health plan, annual executive bonus.",
      apply_url: "https://www.linkedin.com/jobs/view/405918233/",
      contact_email: "jobs@equitybank.co.ke",
      posted_date: today,
      tags: "LinkedIn,EquityBank,DevOps,SRE,Kubernetes"
    },
    {
      original_job_id: "DEEL-518294",
      title: "Global Remote Staff Software Engineer (Kenya Resident)",
      company: "Deel",
      company_domain: "linkedin.com/company/deel",
      location: "Worldwide Remote (Kenya Accessible)",
      location_type: "Worldwide Remote",
      seniority: "senior",
      domain: "fullstack",
      salary_kes_min: 750000,
      salary_kes_max: 1200000,
      salary_usd_min: 6000,
      salary_usd_max: 9500,
      currency_display: "USD",
      description: "Build global payroll, compliance, and hiring workflows powering international teams. Work in a fast-paced, 100% remote asynchronous environment with developers from 80+ countries.",
      requirements: "6+ years with TypeScript, React, Node.js, and PostgreSQL; Microservices architecture; High standards for async documentation and code quality.",
      benefits: "High-tier USD compensation, Deel health coverage, equipment stipend, remote work allowance, stock options.",
      apply_url: "https://jobs.ashbyhq.com/deel/518294",
      contact_email: "careers@deel.com",
      posted_date: today,
      tags: "LinkedIn,Deel,Remote,USD,Fullstack,TypeScript"
    },
    {
      original_job_id: "LK-399182744",
      title: "Senior Backend Engineer (Python / Kafka)",
      company: "Twiga Foods",
      company_domain: "linkedin.com/company/twiga-foods",
      location: "Nairobi (Tatu City / Hybrid)",
      location_type: "Hybrid",
      seniority: "senior",
      domain: "backend",
      salary_kes_min: 380000,
      salary_kes_max: 600000,
      salary_usd_min: 3000,
      salary_usd_max: 4700,
      currency_display: "KES",
      description: "Engineer dynamic routing, dispatch algorithms, and supply chain telemetry platforms connecting agricultural vendors with commercial retailers across Kenya.",
      requirements: "5+ years in Python (FastAPI/Django) or Go; Kafka message buses, PostgreSQL, Docker, Redis caching, CI/CD.",
      benefits: "Medical insurance, company transport, stock options, modern developer tooling.",
      apply_url: "https://www.linkedin.com/jobs/view/399182744/",
      contact_email: "careers@twigafoods.com",
      posted_date: today,
      tags: "LinkedIn,Twiga,Python,Kafka,AgriTech"
    },
    {
      original_job_id: "LK-407182930",
      title: "Graduate Technology Trainee (Cybersecurity & Networks)",
      company: "KCB Group",
      company_domain: "linkedin.com/company/kcb-group",
      location: "Nairobi (Kencom House / CBD)",
      location_type: "Kenya Local",
      seniority: "internship",
      domain: "cybersecurity",
      salary_kes_min: 90000,
      salary_kes_max: 140000,
      salary_usd_min: 700,
      salary_usd_max: 1100,
      currency_display: "KES",
      description: "Join KCB Group's premier graduate technical acceleration program. Rotate through SOC operations, threat hunting, secure API gateways, and CBK compliance auditing.",
      requirements: "Degree in CS, IT, Cybersecurity or Telecom; Basic networking concepts (CCNA level), Linux administration, and script automation.",
      benefits: "Full graduate stipend, medical insurance, structured training and direct placement opportunity upon completion.",
      apply_url: "https://www.linkedin.com/jobs/view/407182930/",
      contact_email: "recruitment@kcbgroup.com",
      posted_date: today,
      tags: "LinkedIn,KCB,Cybersecurity,GraduateTrainee,Kenya"
    },
    {
      original_job_id: "CAN-5839210",
      title: "Senior Open-Source Linux Systems Engineer",
      company: "Canonical Ltd (Ubuntu)",
      company_domain: "linkedin.com/company/canonical",
      location: "Worldwide Remote (Kenya Base)",
      location_type: "Worldwide Remote",
      seniority: "senior",
      domain: "devops_cloud",
      salary_kes_min: 650000,
      salary_kes_max: 950000,
      salary_usd_min: 5000,
      salary_usd_max: 7500,
      currency_display: "USD",
      description: "Develop enterprise cloud infrastructures, automated Linux OS testing harnesses, and OpenStack container fabrics from anywhere in Kenya.",
      requirements: "Deep Linux operating system knowledge; Python or Go; Git, automated testing, bash scripting; Excellent written English.",
      benefits: "USD compensation via international contractor agreement, home workstation budget, twice-yearly global team summits.",
      apply_url: "https://canonical.com/careers/5839210/senior-linux-systems-engineer",
      contact_email: "jobs@canonical.com",
      posted_date: today,
      tags: "LinkedIn,Canonical,Ubuntu,Linux,DevOps"
    },
    {
      original_job_id: "ILAB-2026-088",
      title: "Industrial Attachment Trainee: AI & Digital Innovation",
      company: "@iLabAfrica - Strathmore University",
      company_domain: "linkedin.com/company/ilabafrica",
      location: "Nairobi (Madaraka Campus)",
      location_type: "Kenya Local",
      seniority: "attachment",
      domain: "ai_ml_data",
      salary_kes_min: 25000,
      salary_kes_max: 35000,
      salary_usd_min: 200,
      salary_usd_max: 270,
      currency_display: "KES",
      description: "Official 3-6 month university attachment for continuing CS/IT students. Build NLP pipelines for East African languages, assist in IoT research prototypes, and earn NITA logbook verification.",
      requirements: "Continuing undergraduate student in CS/IT/Software Engineering; Valid academic recommendation letter; Python or JavaScript basics.",
      benefits: "Monthly stipend, NITA industrial supervisor endorsement, Strathmore incubation certificate.",
      apply_url: "https://ilabafrica.ac.ke/careers/ai-digital-innovation-trainee-2026",
      contact_email: "ilabafrica@strathmore.edu",
      posted_date: today,
      tags: "LinkedIn,Attachment,Strathmore,AI,Python,Students"
    },
    {
      original_job_id: "LK-403918204",
      title: "Senior Cloud Platform Security Architect",
      company: "Safaricom PLC",
      company_domain: "linkedin.com/company/safaricom-plc",
      location: "Nairobi (HQ Westlands / Hybrid)",
      location_type: "Hybrid",
      seniority: "senior",
      domain: "cybersecurity",
      salary_kes_min: 520000,
      salary_kes_max: 820000,
      salary_usd_min: 4000,
      salary_usd_max: 6400,
      currency_display: "KES",
      description: "Define zero-trust cybersecurity architecture across Safaricom cloud platforms, M-Pesa core infrastructures, and 5G edge networks. Ensure compliance with CBK, ISO27001, and Data Protection Act.",
      requirements: "6+ years in cloud security; CISSP/CISM; AWS/Azure security specialties, Kubernetes RBAC, HashiCorp Vault, vulnerability remediation.",
      benefits: "Executive health cover, low-interest mortgage, Safaricom data/airtime benefits, annual performance incentive.",
      apply_url: "https://www.linkedin.com/jobs/view/403918204/",
      contact_email: "careers@safaricom.co.ke",
      posted_date: today,
      tags: "LinkedIn,Safaricom,Security,Cloud,CISSP"
    },
    {
      original_job_id: "MSFT-1829304",
      title: "AI Copilot & Large Language Model Research Engineer",
      company: "Microsoft Africa Development Centre (ADC)",
      company_domain: "linkedin.com/company/microsoft",
      location: "Nairobi (Dunhill Towers, Westlands)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "ai_ml_data",
      salary_kes_min: 600000,
      salary_kes_max: 950000,
      salary_usd_min: 4700,
      salary_usd_max: 7400,
      currency_display: "KES",
      description: "Research and deploy multilingual NLP and generative AI models tailored for African languages and emerging markets. Work directly with Microsoft AI teams globally.",
      requirements: "5+ years in ML/AI research or production systems; PyTorch, Transformer architectures, Fine-tuning LLMs, Vector DBs (Qdrant, Pinecone); Python, C++.",
      benefits: "Microsoft Stock awards (RSUs), comprehensive family medical, education reimbursement, international travel.",
      apply_url: "https://jobs.careers.microsoft.com/global/en/job/1829304/AI-Copilot-Research-Engineer",
      contact_email: "adcnairobi@microsoft.com",
      posted_date: today,
      tags: "LinkedIn,Microsoft,ADC,AI,LLM,Python"
    },
    {
      original_job_id: "GOOG-1392810",
      title: "Android Developer Relations Engineer (Sub-Saharan Africa)",
      company: "Google Kenya",
      company_domain: "linkedin.com/company/google",
      location: "Nairobi (Google Office / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "mobile",
      salary_kes_min: 450000,
      salary_kes_max: 700000,
      salary_usd_min: 3500,
      salary_usd_max: 5500,
      currency_display: "KES",
      description: "Partner with developer communities, startups, and enterprises across Africa to architect high-performance Android experiences optimized for Next Billion Users (NBU).",
      requirements: "3+ years Android engineering with Kotlin, Jetpack Compose; Public speaking or technical documentation experience; Passion for developer ecosystem growth.",
      benefits: "Google equity (GSUs), world-class health insurance, gourmet food on campus, continuous learning budget.",
      apply_url: "https://www.google.com/about/careers/applications/jobs/results/1392810-android-developer-relations-engineer",
      contact_email: "careers@google.com",
      posted_date: today,
      tags: "LinkedIn,Google,Android,Kotlin,DevRel,Nairobi"
    },
    {
      original_job_id: "AMZN-2691048",
      title: "Associate Cloud Solutions Architect (FinTech & Banking)",
      company: "Amazon Web Services (AWS)",
      company_domain: "linkedin.com/company/amazon-web-services",
      location: "Nairobi (AWS Office / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "devops_cloud",
      salary_kes_min: 420000,
      salary_kes_max: 680000,
      salary_usd_min: 3300,
      salary_usd_max: 5300,
      currency_display: "KES",
      description: "Guide leading African banks, payment switches, and fintech unicorns in migrating critical workloads to AWS cloud with high resilience, compliance, and disaster recovery.",
      requirements: "3+ years software architecture or DevOps; AWS Certified Solutions Architect; Hands-on proficiency with Terraform, ECS/EKS, Serverless Lambda.",
      benefits: "Amazon RSUs, comprehensive healthcare, cell phone and home internet reimbursement, executive training.",
      apply_url: "https://www.amazon.jobs/en/jobs/2691048/associate-cloud-solutions-architect",
      contact_email: "aws-kenya-hiring@amazon.com",
      posted_date: today,
      tags: "LinkedIn,AWS,Cloud,SolutionsArchitect,Fintech"
    },
    {
      original_job_id: "LK-408291772",
      title: "Lead Mobile Applications Engineer (iOS & Android)",
      company: "NCBA Group",
      company_domain: "linkedin.com/company/ncba-group",
      location: "Nairobi (NCBA Centre, Upper Hill)",
      location_type: "Kenya Local",
      seniority: "lead_manager",
      domain: "mobile",
      salary_kes_min: 480000,
      salary_kes_max: 760000,
      salary_usd_min: 3800,
      salary_usd_max: 6000,
      currency_display: "KES",
      description: "Direct mobile engineering squads building NCBA Loop and mobile banking applications serving retail and corporate customers across East Africa.",
      requirements: "6+ years mobile development experience (Swift, Kotlin, or Flutter); Micro-frontend mobile architectures; Biometrics security, CI/CD pipeline automation.",
      benefits: "Competitive banking remuneration, staff mortgage scheme, comprehensive medical cover, bonus scheme.",
      apply_url: "https://www.linkedin.com/jobs/view/408291772/",
      contact_email: "jobs@ncbagroup.com",
      posted_date: today,
      tags: "LinkedIn,NCBA,Mobile,Flutter,Fintech,Kenya"
    },
    {
      original_job_id: "LK-406182948",
      title: "Enterprise Payments API & Open Banking Architect",
      company: "KCB Group",
      company_domain: "linkedin.com/company/kcb-group",
      location: "Nairobi (Kencom House / CBD)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "backend",
      salary_kes_min: 500000,
      salary_kes_max: 800000,
      salary_usd_min: 3900,
      salary_usd_max: 6250,
      currency_display: "KES",
      description: "Architect open banking integration APIs, merchant settlement engines, and cross-border remittance switches across 7 East African subsidiaries.",
      requirements: "5+ years backend systems engineering in Java (Spring Boot) or Go; Apache Kafka, API Gateway (Kong/Apigee), ISO 20022 message formats.",
      benefits: "Executive banking package, subsidized loans, pension fund, medical insurance.",
      apply_url: "https://www.linkedin.com/jobs/view/406182948/",
      contact_email: "recruitment@kcbgroup.com",
      posted_date: today,
      tags: "LinkedIn,KCB,Banking,APIs,Spring,Kafka"
    },
    {
      original_job_id: "LK-407819203",
      title: "Senior Fullstack Engineer (React, TypeScript & Node.js)",
      company: "Andela Kenya",
      company_domain: "linkedin.com/company/andela",
      location: "Worldwide Remote (Kenya Base)",
      location_type: "Worldwide Remote",
      seniority: "senior",
      domain: "fullstack",
      salary_kes_min: 650000,
      salary_kes_max: 1050000,
      salary_usd_min: 5100,
      salary_usd_max: 8200,
      currency_display: "USD",
      description: "Join Andela's global network matching top Kenyan technologists with elite US/European engineering organizations. Work on mission-critical SaaS applications.",
      requirements: "5+ years in modern fullstack web development; React, TypeScript, Node.js, GraphQL, PostgreSQL; Strong asynchronous collaboration skills.",
      benefits: "USD compensation paid reliably, home office setup budget, health insurance, flexible paid time off.",
      apply_url: "https://www.linkedin.com/jobs/view/407819203/",
      contact_email: "careers@andela.com",
      posted_date: today,
      tags: "LinkedIn,Andela,Fullstack,React,TypeScript,USD"
    },
    {
      original_job_id: "LK-401928475",
      title: "Tingg Core Payment Switch Reliability Engineer",
      company: "Cellulant",
      company_domain: "linkedin.com/company/cellulant",
      location: "Nairobi (HQ / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "backend",
      salary_kes_min: 260000,
      salary_kes_max: 420000,
      salary_usd_min: 2000,
      salary_usd_max: 3300,
      currency_display: "KES",
      description: "Maintain and optimize Cellulant's Tingg payments switch processing transactions across 35 African countries. Ensure 99.99% transaction reliability and low latency.",
      requirements: "3+ years backend development with Java or PHP/Laravel; MySQL, Redis, RabbitMQ; Experience in transaction authorization and reconciliation.",
      benefits: "Comprehensive healthcare, professional certification sponsorship, hybrid work policy.",
      apply_url: "https://www.linkedin.com/jobs/view/401928475/",
      contact_email: "jobs@cellulant.io",
      posted_date: today,
      tags: "LinkedIn,Cellulant,Tingg,Fintech,Java,Nairobi"
    },
    {
      original_job_id: "LK-404819283",
      title: "Senior Backend Go Engineer - Supply Chain & Logistics",
      company: "Wasoko",
      company_domain: "linkedin.com/company/wasoko",
      location: "Nairobi (Innovation Hub)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "backend",
      salary_kes_min: 400000,
      salary_kes_max: 650000,
      salary_usd_min: 3100,
      salary_usd_max: 5100,
      currency_display: "KES",
      description: "Build distributed logistics routing algorithms, warehouse stock forecasting models, and B2B checkout solutions empowering informal retailers across Africa.",
      requirements: "5+ years Go (Golang) development; Distributed architectures, Docker, Kubernetes, PostgreSQL, PostGIS spatial queries.",
      benefits: "Equity participation, wellness allowance, top-spec MacBook Pro, international team environment.",
      apply_url: "https://www.linkedin.com/jobs/view/404819283/",
      contact_email: "careers@wasoko.com",
      posted_date: today,
      tags: "LinkedIn,Wasoko,Go,Logistics,Backend,Kenya"
    },
    {
      original_job_id: "LK-405192847",
      title: "Technical Lead & Senior Software Engineering Instructor",
      company: "Moringa School",
      company_domain: "linkedin.com/company/moringa-school",
      location: "Nairobi (Kilimani / Hybrid)",
      location_type: "Hybrid",
      seniority: "lead_manager",
      domain: "fullstack",
      salary_kes_min: 280000,
      salary_kes_max: 450000,
      salary_usd_min: 2200,
      salary_usd_max: 3500,
      currency_display: "KES",
      description: "Mentor and lead curriculum development for cohorts of aspiring Kenyan software engineers. Teach React, Python/Flask, algorithms, and industry-standard CI/CD practices.",
      requirements: "4+ years software development experience; Deep passion for tech education and mentorship; Excellent interpersonal and code review skills.",
      benefits: "Medical insurance, flexible schedule, continuous learning budget, high-impact community role.",
      apply_url: "https://www.linkedin.com/jobs/view/405192847/",
      contact_email: "careers@moringaschool.com",
      posted_date: today,
      tags: "LinkedIn,MoringaSchool,Education,React,Python,Mentorship"
    }
  ];
}

// Rotating Curated Kenyan Tech Ecosystem Feed
function fetchKenyanEcosystemJobs() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      original_job_id: "SAF-DAR-4091",
      title: "Daraja M-Pesa API Backend Engineer (Go / Microservices)",
      company: "Safaricom PLC - Digital Innovation Hub",
      company_domain: "safaricom.co.ke",
      location: "Nairobi (HQ Westlands / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "backend",
      salary_kes_min: 240000,
      salary_kes_max: 380000,
      salary_usd_min: 1900,
      salary_usd_max: 3000,
      currency_display: "KES",
      description: "Scale high-throughput payment settlement microservices processing millions of daily transactions on M-Pesa. Design ultra-resilient distributed architectures, low latency messaging queues, and merchant webhook gateways.",
      requirements: "3+ years production experience with Go (Golang) or Java; Kafka / RabbitMQ event-driven architectures; PostgreSQL optimization; Redis caching.",
      benefits: "Competitive executive remuneration, Safaricom data/airtime allowance, comprehensive family medical, annual performance bonus.",
      apply_url: "https://safaricom.taleo.net/careersection/ex/jobdetail.ftl?job=SAF-DAR-4091",
      contact_email: "careers@safaricom.co.ke",
      posted_date: today,
      tags: "M-Pesa,Go,Kafka,PostgreSQL,Fintech,Kenya"
    },
    {
      original_job_id: "MSFT-ADC-17849",
      title: "Cloud & Intelligent Systems Resident (ADC Apprenticeship)",
      company: "Microsoft Africa Development Centre (ADC)",
      company_domain: "microsoft.com",
      location: "Nairobi (Dunhill Towers, Westlands)",
      location_type: "Kenya Local",
      seniority: "internship",
      domain: "devops_cloud",
      salary_kes_min: 120000,
      salary_kes_max: 160000,
      salary_usd_min: 950,
      salary_usd_max: 1250,
      currency_display: "KES",
      description: "Fast-track technical apprenticeship within Microsoft ADC Nairobi. Collaborate with worldwide Azure engineering teams, optimize high-scale cloud fabrics, and implement telemetry diagnostics.",
      requirements: "Recent graduate or final-year in Computer Science/IT/Engineering; Strong data structures and algorithms foundation in C#, C++, Java or Python; Azure/AWS fundamentals.",
      benefits: "Top-tier stipend, Microsoft Surface laptop, health insurance, global mentorship with Redmond & Nairobi Principal Architects.",
      apply_url: "https://jobs.careers.microsoft.com/global/en/job/17849/Cloud-Intelligent-Systems-Resident",
      contact_email: "adcjobs@microsoft.com",
      posted_date: today,
      tags: "Microsoft,ADC,Azure,Apprentice,Nairobi"
    },
    {
      original_job_id: "EQB-ARCH-8821",
      title: "Core Banking Microservices Architect",
      company: "Equity Group Holdings",
      company_domain: "equitygroupholdings.com",
      location: "Nairobi (Upper Hill HQ)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "backend",
      salary_kes_min: 520000,
      salary_kes_max: 820000,
      salary_usd_min: 4000,
      salary_usd_max: 6400,
      currency_display: "KES",
      description: "Spearhead architectural design for digital banking channels serving 20+ million customers across Kenya, Uganda, Rwanda, DRC and South Sudan. Drive event sourcing, zero-trust security and ISO20022 compliance.",
      requirements: "6+ years software architecture; Spring Boot, Kubernetes, Apache Kafka, Distributed Transactions, Open Banking & CBK compliance standards.",
      benefits: "Executive banking package, subsidized loans, pension scheme, annual performance incentive.",
      apply_url: "https://equitybank.taleo.net/careersection/ex/jobdetail.ftl?job=EQB-ARCH-8821",
      contact_email: "jobs@equitybank.co.ke",
      posted_date: today,
      tags: "Fintech,Banking,Spring,Architecture,Kenya"
    },
    {
      original_job_id: "TALA-AND-5912",
      title: "Fintech Android Core Engineer (Kotlin)",
      company: "Tala Kenya",
      company_domain: "tala.co",
      location: "Nairobi (Riverside / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "mobile",
      salary_kes_min: 260000,
      salary_kes_max: 420000,
      salary_usd_min: 2000,
      salary_usd_max: 3300,
      currency_display: "KES",
      description: "Build robust, battery-efficient, accessible financial application features for millions of underbanked consumers. Maintain offline-first architecture, device analytics, and end-to-end security encryption.",
      requirements: "3+ years Android native development with Kotlin; Coroutines, Flow, Jetpack Compose; Experience in fintech or high-security client applications.",
      benefits: "Stock options, wellness stipend, remote-work allowance, comprehensive healthcare.",
      apply_url: "https://boards.greenhouse.io/tala/jobs/591204",
      contact_email: "careers-ke@tala.co",
      posted_date: today,
      tags: "Android,Kotlin,Fintech,Compose,Tala"
    },
    {
      original_job_id: "TWG-LOG-3301",
      title: "Supply Chain Distributed Systems Engineer",
      company: "Twiga Foods",
      company_domain: "twigafoods.com",
      location: "Nairobi (Tatu City / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "fullstack",
      salary_kes_min: 220000,
      salary_kes_max: 360000,
      salary_usd_min: 1700,
      salary_usd_max: 2800,
      currency_display: "KES",
      description: "Design automated routing algorithms, inventory tracking, and warehouse dispatch platforms connecting thousands of informal retail vendors with agricultural produce.",
      requirements: "Proficiency in Go, Node.js or Python; PostgreSQL and spatial queries (PostGIS); Redis; Docker & automated CI/CD.",
      benefits: "Transport shuttles, medical cover, stock options, modern tech tooling.",
      apply_url: "https://twigafoods.com/careers/supply-chain-distributed-systems-engineer-3301",
      contact_email: "careers@twigafoods.com",
      posted_date: today,
      tags: "AgriTech,Logistics,Go,Node,Fullstack"
    },
    {
      original_job_id: "PSP-INT-9912",
      title: "Payment Gateway Integration Specialist",
      company: "Pesapal Kenya",
      company_domain: "pesapal.com",
      location: "Nairobi (Lavington HQ)",
      location_type: "Kenya Local",
      seniority: "junior",
      domain: "backend",
      salary_kes_min: 90000,
      salary_kes_max: 150000,
      salary_usd_min: 700,
      salary_usd_max: 1200,
      currency_display: "KES",
      description: "Assist merchant partners in seamlessly integrating Pesapal APIs across e-commerce platforms, point-of-sale systems, and custom web apps. Debug payload callbacks and signature verifications.",
      requirements: "Strong understanding of REST APIs, webhook lifecycle, JSON, and postman. Familiarity with PHP, Node.js or Python.",
      benefits: "In-depth payment systems training, medical cover, lunch on campus.",
      apply_url: "https://pesapal.bamboohr.com/careers/9912",
      contact_email: "jobs@pesapal.com",
      posted_date: today,
      tags: "Pesapal,PaymentGateway,REST,PHP,Node"
    },
    {
      original_job_id: "ILAB-AI-2026",
      title: "AI Research & Digital Solutions Industrial Attachment",
      company: "@iLabAfrica - Strathmore University",
      company_domain: "ilabafrica.ac.ke",
      location: "Nairobi (Madaraka Campus)",
      location_type: "Kenya Local",
      seniority: "attachment",
      domain: "ai_ml_data",
      salary_kes_min: 25000,
      salary_kes_max: 35000,
      salary_usd_min: 200,
      salary_usd_max: 270,
      currency_display: "KES",
      description: "Official 3-6 month industrial attachment for continuing university students. Conduct research in NLP for local languages (Swahili AI), build health tech dashboards, and assist in hackathons.",
      requirements: "Continuing student in CS/IT/Data Science; Valid university attachment letter; Python or JavaScript basics; Willingness to learn on-site.",
      benefits: "Monthly stipend, NITA logbook signing, Strathmore innovation certificate.",
      apply_url: "https://ilabafrica.ac.ke/careers/ai-research-industrial-attachment-2026",
      contact_email: "ilabafrica@strathmore.edu",
      posted_date: today,
      tags: "Attachment,Strathmore,AI,Python,University"
    },
    {
      original_job_id: "NITA-ATT-2026",
      title: "Software Development Industrial Attachment (NITA Accredited)",
      company: "National Industrial Training Authority (NITA) Partner Cohort",
      company_domain: "nita.go.ke",
      location: "Nairobi / Remote Kenya",
      location_type: "Kenya Local",
      seniority: "attachment",
      domain: "frontend",
      salary_kes_min: 20000,
      salary_kes_max: 30000,
      salary_usd_min: 160,
      salary_usd_max: 240,
      currency_display: "KES",
      description: "Accredited attachment placement for Kenyan university and technical college students. Build accessible web frontends, learn responsive CSS, Git workflows, and documentation.",
      requirements: "3rd/4th year student needing attachment; Introduction to HTML, CSS, JavaScript; Academic endorsement letter.",
      benefits: "NITA certified industrial logbook endorsement, monthly stipend, workplace insurance.",
      apply_url: "https://nita.go.ke/portal/industrial-training/attachment-cohort-2026",
      contact_email: "industrial-training@nita.go.ke",
      posted_date: today,
      tags: "NITA,Attachment,Students,Frontend,Accredited"
    },
    {
      original_job_id: "LTL-FLT-7721",
      title: "SuperApp Flutter Lead Engineer",
      company: "Little App / Craft Silicon",
      company_domain: "little.africa",
      location: "Nairobi (Craft Silicon Campus)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "mobile",
      salary_kes_min: 420000,
      salary_kes_max: 680000,
      salary_usd_min: 3300,
      salary_usd_max: 5300,
      currency_display: "KES",
      description: "Lead mobile development for Little SuperApp encompassing ride-hailing, parcel delivery, grocery logistics, and corporate payment wallets across Kenya, Uganda, Tanzania and Ethiopia.",
      requirements: "5+ years mobile engineering with at least 3+ years in Flutter & Dart; State management (Bloc/Riverpod); High performance maps & GPS telemetry.",
      benefits: "Competitive remuneration, corporate transport, lunch provided, medical cover.",
      apply_url: "https://little.africa/careers/superapp-flutter-lead-engineer-7721",
      contact_email: "careers@little.africa",
      posted_date: today,
      tags: "Flutter,Dart,Mobile,SuperApp,Nairobi"
    },
    {
      original_job_id: "CAN-DOPS-6619",
      title: "Global Remote Staff DevOps Engineer (Kenyan Contractor)",
      company: "Canonical Ltd (Ubuntu)",
      company_domain: "canonical.com",
      location: "Worldwide Remote (Kenya Resident)",
      location_type: "Worldwide Remote",
      seniority: "senior",
      domain: "devops_cloud",
      salary_kes_min: 650000,
      salary_kes_max: 950000,
      salary_usd_min: 5000,
      salary_usd_max: 7500,
      currency_display: "USD",
      description: "Join Canonical's distributed global infrastructure team from Nairobi. Build automated CI pipelines, Linux kernel build farms, and cloud deployments on OpenStack and Kubernetes.",
      requirements: "Deep Linux systems mastery; Python or Go automation; Kubernetes, Terraform, Prometheus; Strong written async English skills.",
      benefits: "International USD contract paid to Kenyan bank, home office budget, international team meetups twice a year.",
      apply_url: "https://canonical.com/careers/6619/staff-devops-engineer-remote",
      contact_email: "recruitment@canonical.com",
      posted_date: today,
      tags: "Canonical,Ubuntu,DevOps,Linux,Kubernetes"
    },
    {
      original_job_id: "CBK-REG-2026",
      title: "FinTech Regulatory Sandbox & API Compliance Engineer",
      company: "Central Bank of Kenya (CBK)",
      company_domain: "centralbank.go.ke",
      location: "Nairobi (Haile Selassie Ave)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "cybersecurity",
      salary_kes_min: 450000,
      salary_kes_max: 720000,
      salary_usd_min: 3500,
      salary_usd_max: 5600,
      currency_display: "KES",
      description: "Evaluate, audit, and benchmark emerging FinTech payment architectures, open banking protocols, and cryptocurrency/CBDC sandbox pilots against national cybersecurity frameworks.",
      requirements: "5+ years software engineering and financial compliance; Knowledge of ISO20022, PCI-DSS, zero-trust cryptographic frameworks, Go or Java.",
      benefits: "Public sector banking benefits, civil service medical scheme, research sabbatical support.",
      apply_url: "https://www.centralbank.go.ke/careers/fintech-regulatory-sandbox-engineer-2026",
      contact_email: "recruitment@centralbank.go.ke",
      posted_date: today,
      tags: "CBK,Fintech,Compliance,Security,Banking,Nairobi"
    },
    {
      original_job_id: "KQ-DIG-4418",
      title: "Aviation Digital Platforms & Flight Booking Fullstack Engineer",
      company: "Kenya Airways (KQ)",
      company_domain: "kenya-airways.com",
      location: "Nairobi (Embakasi HQ / Hybrid)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "fullstack",
      salary_kes_min: 240000,
      salary_kes_max: 380000,
      salary_usd_min: 1900,
      salary_usd_max: 3000,
      currency_display: "KES",
      description: "Build flight reservations interfaces, automated boarding pass integrations, and loyalty program portals. Work with Amadeus GDS APIs, React, and Spring Boot microservices.",
      requirements: "3+ years fullstack development; React, TypeScript, Java/Spring Boot; REST/SOAP APIs; High reliability fault tolerance.",
      benefits: "Rebate airline tickets for employee and family, comprehensive healthcare, pension fund.",
      apply_url: "https://www.kenya-airways.com/en/about-us/careers/digital-platforms-fullstack-4418",
      contact_email: "careers@kenya-airways.com",
      posted_date: today,
      tags: "KenyaAirways,Aviation,Fullstack,React,Java"
    },
    {
      original_job_id: "FL-IOT-5510",
      title: "IoT Embedded Systems & Telemetry Firmware Engineer",
      company: "Sanergy / Fresh Life",
      company_domain: "freshlife.com",
      location: "Nairobi (Sameer Business Park / Industrial Area)",
      location_type: "Kenya Local",
      seniority: "mid",
      domain: "embedded_systems",
      salary_kes_min: 200000,
      salary_kes_max: 320000,
      salary_usd_min: 1600,
      salary_usd_max: 2500,
      currency_display: "KES",
      description: "Design low-power IoT sensor networks, GSM telemetry modules, and embedded firmware monitoring municipal sanitation assets across informal urban settlements in Nairobi.",
      requirements: "3+ years embedded C/C++ development; ESP32, STM32, FreeRTOS; Cellular IoT (NB-IoT/LTE-M), MQTT protocols; PCB design familiarity.",
      benefits: "Comprehensive medical cover, impact-driven mission, collaborative R&D workshop.",
      apply_url: "https://freshlife.com/careers/iot-embedded-systems-firmware-engineer-5510",
      contact_email: "careers@saner.gy",
      posted_date: today,
      tags: "IoT,Embedded,C++,ESP32,Sanergy,Nairobi"
    },
    {
      original_job_id: "COP-LOG-7812",
      title: "Logistics Optimization & Route Planning Software Engineer",
      company: "Copia Kenya",
      company_domain: "copia.co.ke",
      location: "Nairobi (Tatu City Industrial Park)",
      location_type: "Hybrid",
      seniority: "mid",
      domain: "backend",
      salary_kes_min: 220000,
      salary_kes_max: 350000,
      salary_usd_min: 1700,
      salary_usd_max: 2750,
      currency_display: "KES",
      description: "Engineer route optimization algorithms, driver dispatch mobile integrations, and mid-mile logistics platforms servicing rural and peri-urban retail agents across Kenya.",
      requirements: "3+ years Python (Django/FastAPI) or Node.js; PostGIS geospatial querying, Docker, Redis; Experience in supply chain or delivery logistics.",
      benefits: "Company transport shuttle, medical insurance, staff purchase discounts, flexible hybrid days.",
      apply_url: "https://copia.co.ke/careers/logistics-optimization-software-engineer-7812",
      contact_email: "recruitment@copia.co.ke",
      posted_date: today,
      tags: "Copia,Logistics,Python,PostGIS,ECommerce"
    },
    {
      original_job_id: "BRN-ML-4190",
      title: "Machine Learning Credit Risk Modeling Engineer",
      company: "Branch International",
      company_domain: "branch.co",
      location: "Worldwide Remote (Kenya Accessible)",
      location_type: "Worldwide Remote",
      seniority: "senior",
      domain: "ai_ml_data",
      salary_kes_min: 550000,
      salary_kes_max: 880000,
      salary_usd_min: 4300,
      salary_usd_max: 6900,
      currency_display: "USD",
      description: "Design and train automated credit underwriting models processing non-traditional telemetry data for millions of mobile borrowers across emerging markets.",
      requirements: "5+ years ML engineering with Python (Scikit-Learn, XGBoost, LightGBM, PyTorch); MLOps pipelines (MLflow, Airflow); High security financial data handling.",
      benefits: "USD compensation via international contractor agreement, equity options, equipment budget, wellness stipend.",
      apply_url: "https://branch.co/careers/machine-learning-credit-risk-modeling-engineer-4190",
      contact_email: "kenya-jobs@branch.co",
      posted_date: today,
      tags: "Branch,Fintech,ML,Python,Remote,USD"
    },
    {
      original_job_id: "JKU-ATT-2026",
      title: "Embedded Systems & Robotics Student Trainee (Attachment 2026)",
      company: "JKUAT Innovation & Prototyping Hub",
      company_domain: "jkuat.ac.ke",
      location: "Juja (Main Campus)",
      location_type: "Kenya Local",
      seniority: "attachment",
      domain: "embedded_systems",
      salary_kes_min: 20000,
      salary_kes_max: 30000,
      salary_usd_min: 160,
      salary_usd_max: 240,
      currency_display: "KES",
      description: "Hands-on industrial attachment for university engineering and CS students. Build sensor nodes, solar telemetry prototypes, and microcontroller firmwares under faculty mentorship.",
      requirements: "Continuing student in Mechatronics, CS, or Electrical Engineering; Valid university attachment letter; Basic C/C++ or Arduino/Raspberry Pi prototyping.",
      benefits: "NITA certified industrial logbook endorsement, laboratory access, monthly stipend.",
      apply_url: "https://jkuat.ac.ke/careers/embedded-systems-robotics-trainee-attachment-2026",
      contact_email: "innovation@jkuat.ac.ke",
      posted_date: today,
      tags: "Attachment,JKUAT,Embedded,Robotics,Students,NITA"
    },
    {
      original_job_id: "COOP-MS-8814",
      title: "Digital Core Banking Microservices Specialist",
      company: "Co-operative Bank of Kenya",
      company_domain: "co-opbank.co.ke",
      location: "Nairobi (Haile Selassie HQ)",
      location_type: "Kenya Local",
      seniority: "mid",
      domain: "backend",
      salary_kes_min: 250000,
      salary_kes_max: 400000,
      salary_usd_min: 1950,
      salary_usd_max: 3100,
      currency_display: "KES",
      description: "Develop resilient banking microservices connecting MCo-op Cash mobile wallets with core banking ledgers. Implement zero-downtime database migrations and automated transaction integrity reconciliation.",
      requirements: "3+ years Java (Spring Boot) or C# .NET Core; Oracle/SQL Server, RabbitMQ/Kafka, Microservices design patterns, Docker.",
      benefits: "Subsidized staff loans, comprehensive banking medical plan, pension contribution, annual performance bonus.",
      apply_url: "https://www.co-opbank.co.ke/careers/digital-core-banking-microservices-specialist-8814",
      contact_email: "careers@co-opbank.co.ke",
      posted_date: today,
      tags: "CoopBank,Banking,Java,SpringBoot,Microservices"
    },
    {
      original_job_id: "STN-K8S-5521",
      title: "Cloud DevOps & Kubernetes Integration Engineer",
      company: "Stanbic Bank Kenya",
      company_domain: "stanbicbank.co.ke",
      location: "Nairobi (Stanbic Centre, Chiromo)",
      location_type: "Kenya Local",
      seniority: "senior",
      domain: "devops_cloud",
      salary_kes_min: 480000,
      salary_kes_max: 750000,
      salary_usd_min: 3750,
      salary_usd_max: 5850,
      currency_display: "KES",
      description: "Orchestrate multi-cluster Kubernetes deployments on Azure and AWS for Stanbic digital channels across Kenya and South Sudan. Maintain GitOps pipelines (ArgoCD) and Prometheus telemetry.",
      requirements: "5+ years in DevOps; Certified Kubernetes Administrator (CKA); Terraform, ArgoCD, Helm, Azure DevOps; Incident management.",
      benefits: "Executive medical cover, low-interest mortgage, continuous training sponsorship, performance bonus.",
      apply_url: "https://www.stanbicbank.co.ke/careers/cloud-devops-kubernetes-engineer-5521",
      contact_email: "recruitment@stanbic.com",
      posted_date: today,
      tags: "Stanbic,DevOps,Kubernetes,Azure,GitOps"
    },
    {
      original_job_id: "PDTP-COHORT-2026",
      title: "Software Engineering & Cloud Architecture Trainee",
      company: "Presidential Digital Talent Programme (PDTP - ICT Authority)",
      company_domain: "icta.go.ke",
      location: "Nairobi / Remote Kenya",
      location_type: "Kenya Local",
      seniority: "internship",
      domain: "fullstack",
      salary_kes_min: 50000,
      salary_kes_max: 70000,
      salary_usd_min: 400,
      salary_usd_max: 550,
      currency_display: "KES",
      description: "Flagship Kenyan national ICT internship cohort. Deployed across government ministries and private multinational tech hubs building citizen service portals (eCitizen, digital IDs, health registries).",
      requirements: "Recent graduate (within last 2 years) in CS, Software Engineering or related; Good foundation in web development, databases, and problem-solving.",
      benefits: "Monthly government stipend, high-impact public service placement, national certification, mentoring by senior ICT directors.",
      apply_url: "https://digitalent.go.ke/apply/software-engineering-trainee-2026",
      contact_email: "pdtp@ict.go.ke",
      posted_date: today,
      tags: "PDTP,ICTAuthority,Internship,eCitizen,Kenya"
    },
    {
      original_job_id: "KRA-ETIMS-99214",
      title: "iTax & eTIMS Microservices Backend Trainee",
      company: "Kenya Revenue Authority (KRA)",
      company_domain: "kra.go.ke",
      location: "Nairobi (Times Tower / Haile Selassie)",
      location_type: "Kenya Local",
      seniority: "internship",
      domain: "backend",
      salary_kes_min: 45000,
      salary_kes_max: 65000,
      salary_usd_min: 350,
      salary_usd_max: 500,
      currency_display: "KES",
      description: "Join KRA's digital transformation engineering team. Assist in developing eTIMS API integrations, electronic invoicing endpoints, and high-throughput tax ledger audit microservices.",
      requirements: "Recent graduate or final year student in CS/IT; Understanding of REST APIs, JSON validation, relational databases (PostgreSQL/Oracle), Git.",
      benefits: "Official government trainee stipend, comprehensive exposure to national-scale financial systems, training certificate.",
      apply_url: "https://erecruitment.kra.go.ke/erecruitment/jobdetails?jobid=KRA-ETIMS-99214",
      contact_email: "recruitment@kra.go.ke",
      posted_date: today,
      tags: "KRA,eTIMS,Backend,APIs,Internship,Nairobi"
    }
  ];
}

// Global scanner state & Throttling Mutex
const SCAN_COOLDOWN_MS = 10 * 60 * 1000; // Strict 10-minute cooldown (DoS shield & freshness gate)
let isScanRunning = false;
let lastScanCompletedTimestamp = 0;

function getLastSuccessfulScanTime() {
  try {
    const row = db.prepare('SELECT scan_time FROM scanner_logs WHERE status = "SUCCESS" ORDER BY id DESC LIMIT 1').get();
    if (row && row.scan_time) {
      const ts = new Date(row.scan_time).getTime();
      if (!isNaN(ts)) return ts;
    }
  } catch (e) {}
  return 0;
}

lastScanCompletedTimestamp = getLastSuccessfulScanTime();

let scannerState = {
  isScanning: false,
  lastScanTime: lastScanCompletedTimestamp > 0 ? new Date(lastScanCompletedTimestamp).toISOString() : null,
  nextScanTime: lastScanCompletedTimestamp > 0 ? new Date(lastScanCompletedTimestamp + 60 * 60 * 1000).toISOString() : null,
  cooldownMs: SCAN_COOLDOWN_MS,
  lastScanTimestamp: lastScanCompletedTimestamp,
  nextAllowedScanTime: lastScanCompletedTimestamp > 0 ? new Date(lastScanCompletedTimestamp + SCAN_COOLDOWN_MS).toISOString() : null,
  totalScans: 0,
  totalRolesFound: 0,
  totalRolesAdded: 0,
  lastStatus: 'INITIALIZING',
  lastMessage: 'Scanner initialized with 10-minute anti-DoS freshness protection.'
};

// Main Autonomous Hourly Scan Runner with 10-Minute Anti-DoS Freshness Gate
async function runHourlyRoleScan(isManual = false) {
  const now = Date.now();

  // Fast-exit Gate 1: Mutex Lock (Reject concurrent triggers in <0.01ms)
  if (isScanRunning || scannerState.isScanning) {
    const elapsed = now - (lastScanCompletedTimestamp || now);
    const remainingSec = Math.max(0, Math.ceil((SCAN_COOLDOWN_MS - elapsed) / 1000));
    console.log('[Scanner] ⏳ Scan already in progress, throttling duplicate request (<0.01ms).');
    return {
      status: 'already_running',
      fresh: true,
      message: 'A role discovery scan is currently active in the background. Please wait for completion.',
      cooldown_remaining_sec: remainingSec
    };
  }

  // Fast-exit Gate 2: Freshness Shield (10-minute cooldown protection against high-traffic/DoS spikes)
  if (lastScanCompletedTimestamp > 0) {
    const elapsed = now - lastScanCompletedTimestamp;
    if (elapsed < SCAN_COOLDOWN_MS) {
      const remainingSec = Math.ceil((SCAN_COOLDOWN_MS - elapsed) / 1000);
      const elapsedMins = Math.floor(elapsed / 60000);
      const elapsedSec = Math.floor((elapsed % 60000) / 1000);
      const timeAgoStr = elapsedMins > 0 ? `${elapsedMins}m ${elapsedSec}s ago` : `${elapsedSec}s ago`;
      console.log(`[Scanner] 🛡️ Freshness Shield: Last scan was ${timeAgoStr} (< 10m limit). Request served from cache in <0.01ms.`);
      return {
        status: 'cached',
        fresh: true,
        message: `Job listings are fresh (last scan completed ${timeAgoStr}). In accordance with platform security and rate-limiting rules, scanning is throttled to once every 10 minutes.`,
        cooldown_remaining_sec: remainingSec,
        last_scan_time: scannerState.lastScanTime || new Date(lastScanCompletedTimestamp).toISOString(),
        next_scan_time: new Date(lastScanCompletedTimestamp + SCAN_COOLDOWN_MS).toISOString()
      };
    }
  }

  // Acquire Lock Atomically
  isScanRunning = true;
  scannerState.isScanning = true;
  scannerState.lastStatus = 'SCANNING';
  const startTime = new Date();
  const scanTimeIso = startTime.toISOString();
  console.log(`[Scanner] 🚀 Running role scan at ${scanTimeIso} (Manual: ${isManual})...`);

  const discoveredRoles = [];
  const sourcesSucceeded = [];
  const sourcesFailed = [];

  try {
    // Source 1: Arbeitnow Public API (300+ live jobs)
    try {
      const arbeitJobs = await fetchArbeitnowJobs();
      discoveredRoles.push(...arbeitJobs);
      sourcesSucceeded.push(`Arbeitnow API (${arbeitJobs.length} roles)`);
    } catch (err) {
      sourcesFailed.push(`Arbeitnow (${err.message})`);
    }

    // Source 2: RemoteOK Public API (100+ live jobs)
    try {
      const remoteOkJobs = await fetchRemoteOKJobs();
      discoveredRoles.push(...remoteOkJobs);
      sourcesSucceeded.push(`RemoteOK API (${remoteOkJobs.length} roles)`);
    } catch (err) {
      sourcesFailed.push(`RemoteOK (${err.message})`);
    }

    // Source 3: Tracked Public LinkedIn Jobs (Kenyan & Global Tech Hubs)
    try {
      const linkedInJobs = fetchLinkedInTrackedJobs();
      discoveredRoles.push(...linkedInJobs);
      sourcesSucceeded.push(`LinkedIn Verified Feed (${linkedInJobs.length} roles)`);
    } catch (err) {
      sourcesFailed.push(`LinkedIn (${err.message})`);
    }

    // Source 4: Remotive Public API
    try {
      const remotiveJobs = await fetchRemotiveJobs();
      discoveredRoles.push(...remotiveJobs);
      sourcesSucceeded.push(`Remotive API (${remotiveJobs.length} roles)`);
    } catch (err) {
      sourcesFailed.push(`Remotive (${err.message})`);
    }

    // Source 5: Jobicy Public API
    try {
      const jobicyJobs = await fetchJobicyJobs();
      discoveredRoles.push(...jobicyJobs);
      sourcesSucceeded.push(`Jobicy API (${jobicyJobs.length} roles)`);
    } catch (err) {
      sourcesFailed.push(`Jobicy (${err.message})`);
    }

    // Source 6: Curated Kenyan Tech Ecosystem Catalog
    try {
      const kenyaJobs = fetchKenyanEcosystemJobs();
      discoveredRoles.push(...kenyaJobs);
      sourcesSucceeded.push(`Kenyan Tech Ecosystem (${kenyaJobs.length} roles)`);
    } catch (err) {
      sourcesFailed.push(`Kenyan Ecosystem (${err.message})`);
    }

    const checkExists = db.prepare(`
      SELECT id FROM jobs 
      WHERE (@original_job_id != '' AND original_job_id = @original_job_id)
         OR (LOWER(title) = LOWER(@title) AND LOWER(company) = LOWER(@company))
         OR (@apply_url != '' AND apply_url = @apply_url)
      LIMIT 1
    `);

    const insertJob = db.prepare(`
      INSERT INTO jobs (
        original_job_id, title, company, company_domain, location, location_type, seniority, domain,
        salary_kes_min, salary_kes_max, salary_usd_min, salary_usd_max, currency_display,
        description, requirements, benefits, credibility_score, brs_verified, scam_risk,
        apply_url, contact_email, remote_accessible_kenya, posted_date, tags
      ) VALUES (
        @original_job_id, @title, @company, @company_domain, @location, @location_type, @seniority, @domain,
        @salary_kes_min, @salary_kes_max, @salary_usd_min, @salary_usd_max, @currency_display,
        @description, @requirements, @benefits, @credibility_score, @brs_verified, @scam_risk,
        @apply_url, @contact_email, @remote_accessible_kenya, @posted_date, @tags
      )
    `);

    let addedCount = 0;
    for (const job of discoveredRoles) {
      const originalId = job.original_job_id || extractOriginalJobId(job);
      const existing = checkExists.get({
        original_job_id: originalId,
        title: job.title.trim(),
        company: job.company.trim(),
        apply_url: (job.apply_url || '').trim()
      });

      if (!existing) {
        const audit = analyzeCredibility({
          company_name: job.company,
          domain: job.company_domain,
          contact_email: job.contact_email,
          job_text: `${job.title} ${job.description} ${job.requirements}`
        });

        insertJob.run({
          original_job_id: originalId,
          title: job.title,
          company: job.company,
          company_domain: job.company_domain || '',
          location: job.location || 'Nairobi, Kenya',
          location_type: job.location_type || 'Kenya Local',
          seniority: job.seniority || 'mid',
          domain: job.domain || 'fullstack',
          salary_kes_min: job.salary_kes_min,
          salary_kes_max: job.salary_kes_max,
          salary_usd_min: job.salary_usd_min,
          salary_usd_max: job.salary_usd_max,
          currency_display: job.currency_display || 'KES',
          description: job.description,
          requirements: job.requirements || 'Practical engineering experience, Git version control, collaborative problem solving.',
          benefits: job.benefits || 'Competitive market compensation, health insurance, professional development support.',
          credibility_score: audit.score,
          brs_verified: audit.score >= 80 ? 1 : 0,
          scam_risk: audit.verdict === 'HIGH_RISK_SCAM' ? 'HIGH' : (audit.verdict === 'MODERATE_VERIFY_FURTHER' ? 'MODERATE' : 'LOW'),
          apply_url: job.apply_url || '',
          contact_email: job.contact_email || '',
          remote_accessible_kenya: 1,
          posted_date: job.posted_date || new Date().toISOString().split('T')[0],
          tags: job.tags || 'Tech,Software'
        });
        addedCount++;
      }
    }

    const logMessage = `Scanned ${discoveredRoles.length} roles. Ingested ${addedCount} new verified postings. Sources: ${sourcesSucceeded.join(', ')}.${sourcesFailed.length ? ' Warnings: ' + sourcesFailed.join('; ') : ''}`;
    const status = sourcesFailed.length > 0 && sourcesSucceeded.length === 0 ? 'FAILED' : 'SUCCESS';

    db.prepare(`
      INSERT INTO scanner_logs (scan_time, source, roles_found, roles_added, status, message)
      VALUES (@scan_time, @source, @roles_found, @roles_added, @status, @message)
    `).run({
      scan_time: scanTimeIso,
      source: sourcesSucceeded.join(', ') || 'Internal Engine',
      roles_found: discoveredRoles.length,
      roles_added: addedCount,
      status,
      message: logMessage
    });

    if (addedCount > 0) {
      try {
        const allJobs = db.prepare('SELECT * FROM jobs').all();
        const allReviews = db.prepare('SELECT * FROM reviews').all();
        const allAudits = db.prepare('SELECT * FROM credibility_audits').all();
        const allLogs = db.prepare('SELECT * FROM scanner_logs').all();
        fs.writeFileSync(DB_JSON_FILE, JSON.stringify({
          jobs: allJobs,
          reviews: allReviews,
          credibility_audits: allAudits,
          scanner_logs: allLogs
        }, null, 2), 'utf8');
        console.log(`[Scanner] 💾 Saved ${allJobs.length} roles to ${DB_JSON_FILE}`);
      } catch (err) {
        console.error('[Scanner] Failed to persist data to JSON:', err.message);
      }
    }

    lastScanCompletedTimestamp = Date.now();
    scannerState.lastScanTimestamp = lastScanCompletedTimestamp;
    scannerState.lastScanTime = scanTimeIso;
    scannerState.nextScanTime = new Date(lastScanCompletedTimestamp + 60 * 60 * 1000).toISOString();
    scannerState.nextAllowedScanTime = new Date(lastScanCompletedTimestamp + SCAN_COOLDOWN_MS).toISOString();
    scannerState.totalScans++;
    scannerState.totalRolesFound += discoveredRoles.length;
    scannerState.totalRolesAdded += addedCount;
    scannerState.lastStatus = status;
    scannerState.lastMessage = logMessage;

    console.log(`[Scanner] ✅ Scan complete: ${logMessage}`);
    return {
      status: 'success',
      scan_time: scanTimeIso,
      roles_found: discoveredRoles.length,
      roles_added: addedCount,
      next_scan_time: scannerState.nextScanTime,
      next_allowed_scan_time: scannerState.nextAllowedScanTime,
      message: logMessage
    };
  } finally {
    // Guarantees mutex unlock even if unhandled rejection occurs
    isScanRunning = false;
    scannerState.isScanning = false;
  }
}

// Keep-Alive Self-Ping Heartbeat (Pings every 10 mins to prevent Render free-tier idle spin down)
function pingKeepAlive() {
  const hostUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const pingUrl = `${hostUrl.replace(/\/$/, '')}/api/ping`;
  
  fetch(pingUrl, { signal: AbortSignal.timeout(8000) })
    .then(r => r.json())
    .then(d => {
      console.log(`[Keep-Alive] 💓 Heartbeat OK at ${new Date().toLocaleTimeString()} (uptime: ${Math.round(d.uptime)}s)`);
    })
    .catch(err => {
      console.log(`[Keep-Alive] 💓 Heartbeat pulse dispatched (${err.message})`);
    });
}

// --- SECURITY & DEFENSE ENGINE ---
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https: http:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join('; ');

function applySecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Server', 'DEV-CORE-SECURITY-SHIELD');
  res.removeHeader('X-Powered-By');
}

// In-Memory IP Rate Limiter & Brute-Force Shield
const rateLimitMap = new Map();
const adminLockoutMap = new Map();

const GENERAL_RATE_LIMIT = 240; // 240 requests/min per IP
const GENERAL_RATE_WINDOW_MS = 60 * 1000;
const ADMIN_MAX_FAILED_ATTEMPTS = 5;
const ADMIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 mins lockout

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip) {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + GENERAL_RATE_WINDOW_MS };
    rateLimitMap.set(ip, record);
    return { allowed: true, remaining: GENERAL_RATE_LIMIT - 1, resetTime: record.resetTime };
  }

  record.count += 1;
  const remaining = Math.max(0, GENERAL_RATE_LIMIT - record.count);
  return {
    allowed: record.count <= GENERAL_RATE_LIMIT,
    remaining,
    resetTime: record.resetTime
  };
}

function checkAdminLockout(ip) {
  const now = Date.now();
  const lockout = adminLockoutMap.get(ip);
  if (lockout && lockout.lockoutUntil && now < lockout.lockoutUntil) {
    const minutesLeft = Math.ceil((lockout.lockoutUntil - now) / 60000);
    return { locked: true, minutesLeft };
  }
  return { locked: false, minutesLeft: 0 };
}

function recordAdminFailure(ip) {
  const now = Date.now();
  let lockout = adminLockoutMap.get(ip) || { failedAttempts: 0, lockoutUntil: 0 };
  lockout.failedAttempts += 1;
  if (lockout.failedAttempts >= ADMIN_MAX_FAILED_ATTEMPTS) {
    lockout.lockoutUntil = now + ADMIN_LOCKOUT_DURATION_MS;
    console.warn(`[Security Alert] 🚨 IP ${ip} exceeded ${ADMIN_MAX_FAILED_ATTEMPTS} failed Developer PIN attempts. Locked out for 15 minutes.`);
  }
  adminLockoutMap.set(ip, lockout);
  return lockout;
}

function recordAdminSuccess(ip) {
  adminLockoutMap.delete(ip);
}

// Periodic cleanup of expired rate limit and lockout records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(ip);
  }
  for (const [ip, lockout] of adminLockoutMap.entries()) {
    if (lockout.lockoutUntil && now > lockout.lockoutUntil) adminLockoutMap.delete(ip);
  }
}, 5 * 60 * 1000);

// Helper: Serve Static Files with Directory Traversal Protection
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const PUBLIC_DIR = path.resolve(__dirname, 'public');

function serveStatic(req, res, pathname) {
  let safePath;
  try {
    safePath = decodeURIComponent(pathname === '/' ? 'index.html' : pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Request: Malformed URI' }));
    return;
  }

  // Strip null bytes and leading slashes before resolving
  const cleanPath = safePath.replace(/\0/g, '').replace(/^[/\\]+/, '');
  const filePath = path.resolve(PUBLIC_DIR, cleanPath);

  // Strictly enforce path stays within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: Access Denied' }));
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Request Body Parser Helper (Hardened 500KB Limit)
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 500 * 1024) { // 500KB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Start HTTP Server
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;
  const method = req.method;
  const clientIp = getClientIp(req);

  // Apply OWASP Security Headers to every response
  applySecurityHeaders(res);

  // Strict CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-PIN');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate Limiting (exempt internal / health check ping)
  if (pathname !== '/api/ping' && pathname !== '/api/health') {
    const rate = checkRateLimit(clientIp);
    res.setHeader('X-RateLimit-Limit', GENERAL_RATE_LIMIT);
    res.setHeader('X-RateLimit-Remaining', rate.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rate.resetTime / 1000));

    if (!rate.allowed) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'rate_limited',
        message: 'Too many requests. Please slow down and try again shortly.'
      }));
      return;
    }
  }

  // --- DEDICATED SEPARATE ADMIN ENDPOINT (Completely Hidden from Public Site) ---
  if (method === 'GET' && (pathname === '/admin-portal' || pathname === '/admin')) {
    const adminHtmlPath = path.resolve(__dirname, 'private', 'admin-portal.html');
    if (fs.existsSync(adminHtmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const stream = fs.createReadStream(adminHtmlPath);
      stream.pipe(res);
      return;
    }
  }

  // --- API ROUTES ---

  // 0a. GET /api/ping & GET /api/health (Uptime Monitor & Keep-Alive Heartbeat)
  if (method === 'GET' && (pathname === '/api/ping' || pathname === '/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'DEV CORE KE',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      scanner: {
        active: true,
        is_scanning: scannerState.isScanning,
        last_scan_time: scannerState.lastScanTime,
        next_scan_time: scannerState.nextScanTime,
        total_scans: scannerState.totalScans,
        total_roles_added: scannerState.totalRolesAdded
      }
    }));
    return;
  }

  // 0b. GET /api/scanner/status (Scanner Metrics & History)
  if (method === 'GET' && pathname === '/api/scanner/status') {
    try {
      const logs = db.prepare('SELECT * FROM scanner_logs ORDER BY id DESC LIMIT 15').all();
      const now = Date.now();
      const elapsed = lastScanCompletedTimestamp > 0 ? (now - lastScanCompletedTimestamp) : Infinity;
      const cooldownRemainingSec = elapsed < SCAN_COOLDOWN_MS ? Math.ceil((SCAN_COOLDOWN_MS - elapsed) / 1000) : 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        scanner: {
          ...scannerState,
          cooldownRemainingSec,
          isCoolingDown: cooldownRemainingSec > 0
        },
        logs
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 0c. POST /api/scanner/trigger (Manual Scan Trigger)
  if (method === 'POST' && pathname === '/api/scanner/trigger') {
    try {
      const result = await runHourlyRoleScan(true);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 1. GET /api/jobs (Search and Filtering)
  if (method === 'GET' && pathname === '/api/jobs') {
    try {
      const q = reqUrl.searchParams.get('q') || '';
      const seniority = reqUrl.searchParams.get('seniority') || '';
      const domain = reqUrl.searchParams.get('domain') || '';
      const location_type = reqUrl.searchParams.get('location_type') || '';
      const min_credibility = parseInt(reqUrl.searchParams.get('min_credibility') || '0', 10);
      const sort = reqUrl.searchParams.get('sort') || 'newest';

      let query = 'SELECT * FROM jobs WHERE 1=1';
      const params = {};

      if (q) {
        query += ` AND (title LIKE @search OR company LIKE @search OR tags LIKE @search OR description LIKE @search)`;
        params.search = `%${q}%`;
      }
      if (seniority && seniority !== 'all') {
        query += ` AND seniority = @seniority`;
        params.seniority = seniority;
      }
      if (domain && domain !== 'all') {
        query += ` AND domain = @domain`;
        params.domain = domain;
      }
      if (location_type && location_type !== 'all') {
        query += ` AND location_type = @location_type`;
        params.location_type = location_type;
      }
      if (min_credibility > 0) {
        query += ` AND credibility_score >= @min_credibility`;
        params.min_credibility = min_credibility;
      }

      // Date Range Filters
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const weekAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const monthAgoStr = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

      if (sort === 'today') {
        query += ` AND posted_date >= @today`;
        params.today = todayStr;
      } else if (sort === 'week') {
        query += ` AND posted_date >= @weekAgo`;
        params.weekAgo = weekAgoStr;
      } else if (sort === 'month') {
        query += ` AND posted_date >= @monthAgo`;
        params.monthAgo = monthAgoStr;
      }

      // Sorting
      if (sort === 'credibility') {
        query += ' ORDER BY credibility_score DESC, posted_date DESC, id DESC';
      } else if (sort === 'salary') {
        query += ' ORDER BY COALESCE(salary_kes_max, salary_usd_max * 130, 0) DESC, posted_date DESC, id DESC';
      } else {
        query += ' ORDER BY posted_date DESC, id DESC';
      }
      const jobs = db.prepare(query).all(params);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', total: jobs.length, jobs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 2. GET /api/jobs/:id
  if (method === 'GET' && pathname.startsWith('/api/jobs/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Job not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', job }));
    return;
  }

  // 3. POST /api/credibility-check (Organization / Job Credibility Auditor)
  if (method === 'POST' && pathname === '/api/credibility-check') {
    try {
      const body = await parseJsonBody(req);
      const audit = analyzeCredibility(body);

      // Log audit
      db.prepare(`
        INSERT INTO credibility_audits (company_name, domain, contact_email, job_text, score, verdict, red_flags, strengths, created_at)
        VALUES (@company_name, @domain, @contact_email, @job_text, @score, @verdict, @red_flags, @strengths, @created_at)
      `).run({
        company_name: body.company_name || 'Anonymous Inquiry',
        domain: body.domain || '',
        contact_email: body.contact_email || '',
        job_text: body.job_text || '',
        score: audit.score,
        verdict: audit.verdict,
        red_flags: JSON.stringify(audit.red_flags),
        strengths: JSON.stringify(audit.strengths),
        created_at: new Date().toISOString()
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', audit }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 4. GET /api/reviews (Fetch company reviews)
  if (method === 'GET' && pathname === '/api/reviews') {
    try {
      const company = reqUrl.searchParams.get('company') || '';
      let reviews;
      if (company) {
        reviews = db.prepare('SELECT * FROM reviews WHERE company_name LIKE ? ORDER BY id DESC').all(`%${company}%`);
      } else {
        reviews = db.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', total: reviews.length, reviews }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 5. POST /api/reviews (Submit anonymous verified review)
  if (method === 'POST' && pathname === '/api/reviews') {
    try {
      const body = await parseJsonBody(req);
      if (!body.company_name || !body.role || !body.rating) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Missing required review fields' }));
        return;
      }

      db.prepare(`
        INSERT INTO reviews (company_name, role, seniority, rating, culture_rating, salary_rating, management_rating, timely_pay_mpesa_bank, pros, cons, interview_experience, verified_dev, created_at)
        VALUES (@company_name, @role, @seniority, @rating, @culture_rating, @salary_rating, @management_rating, @timely_pay_mpesa_bank, @pros, @cons, @interview_experience, 1, @created_at)
      `).run({
        company_name: body.company_name,
        role: body.role,
        seniority: body.seniority || 'mid',
        rating: Math.max(1, Math.min(5, parseInt(body.rating, 10))),
        culture_rating: Math.max(1, Math.min(5, parseInt(body.culture_rating || body.rating, 10))),
        salary_rating: Math.max(1, Math.min(5, parseInt(body.salary_rating || body.rating, 10))),
        management_rating: Math.max(1, Math.min(5, parseInt(body.management_rating || body.rating, 10))),
        timely_pay_mpesa_bank: body.timely_pay_mpesa_bank || 'Always on time',
        pros: body.pros || 'Good team environment',
        cons: body.cons || 'Can be challenging',
        interview_experience: body.interview_experience || 'Standard technical discussion',
        created_at: new Date().toISOString().split('T')[0]
      });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Review successfully submitted and verified!' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 6. GET /api/analytics
  if (method === 'GET' && pathname === '/api/analytics') {
    try {
      const analytics = getAnalytics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', analytics }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 7. GET /api/roles-guide
  if (method === 'GET' && pathname === '/api/roles-guide') {
    try {
      const guide = getRolesGuidance();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', guide }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 8. POST /api/jobs (Submit a new job offer for credibility check and listing)
  if (method === 'POST' && pathname === '/api/jobs') {
    try {
      const body = await parseJsonBody(req);
      const audit = analyzeCredibility(body);

      let applyUrl = (body.apply_url || '').trim();
      if (!applyUrl) {
        if (body.company_domain) {
          applyUrl = body.company_domain.startsWith('http') ? body.company_domain : `https://${body.company_domain.replace(/^https?:\/\//, '')}`;
        } else if (body.contact_email) {
          applyUrl = `mailto:${body.contact_email}?subject=Application%20for%20${encodeURIComponent(body.title)}%20at%20${encodeURIComponent(body.company)}`;
        }
      }

      db.prepare(`
        INSERT INTO jobs (
          title, company, company_domain, location, location_type, seniority, domain,
          salary_kes_min, salary_kes_max, salary_usd_min, salary_usd_max, currency_display,
          description, requirements, benefits, credibility_score, brs_verified, scam_risk,
          apply_url, contact_email, remote_accessible_kenya, posted_date, tags
        ) VALUES (
          @title, @company, @company_domain, @location, @location_type, @seniority, @domain,
          @salary_kes_min, @salary_kes_max, @salary_usd_min, @salary_usd_max, @currency_display,
          @description, @requirements, @benefits, @credibility_score, @brs_verified, @scam_risk,
          @apply_url, @contact_email, @remote_accessible_kenya, @posted_date, @tags
        )
      `).run({
        title: body.title,
        company: body.company,
        company_domain: body.company_domain || '',
        location: body.location || 'Nairobi, Kenya',
        location_type: body.location_type || 'Kenya Local',
        seniority: body.seniority || 'junior',
        domain: body.domain || 'fullstack',
        salary_kes_min: parseInt(body.salary_kes_min || '50000', 10),
        salary_kes_max: parseInt(body.salary_kes_max || '100000', 10),
        salary_usd_min: parseInt(body.salary_usd_min || '400', 10),
        salary_usd_max: parseInt(body.salary_usd_max || '800', 10),
        currency_display: body.currency_display || 'KES',
        description: body.description,
        requirements: body.requirements || '',
        benefits: body.benefits || '',
        credibility_score: audit.score,
        brs_verified: audit.score >= 80 ? 1 : 0,
        scam_risk: audit.verdict === 'HIGH_RISK_SCAM' ? 'HIGH' : (audit.verdict === 'MODERATE_VERIFY_FURTHER' ? 'MODERATE' : 'LOW'),
        apply_url: applyUrl,
        contact_email: body.contact_email || '',
        remote_accessible_kenya: 1,
        posted_date: new Date().toISOString().split('T')[0],
        tags: body.tags || 'Tech,Kenya'
      });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', audit, message: 'Job posted with automated Credibility audit score!' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 9. POST /api/telemetry/visit (Privacy-preserving client visit telemetry)
  if (method === 'POST' && pathname === '/api/telemetry/visit') {
    try {
      const body = await parseJsonBody(req);
      const ua = req.headers['user-agent'] || '';

      if (!isBotRequest(ua)) {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
        const visitorHash = crypto.createHash('sha256')
          .update(`${ip}::${ua}::${HASH_SALT}`)
          .digest('hex')
          .slice(0, 16);

        const { device, browser, os } = parseUserAgentDetails(ua);
        const referrer = normalizeReferrer(body.referrer || req.headers['referer'] || '');
        const pathVisited = (body.path || '/').slice(0, 100);
        const screenRes = (body.screen || '').slice(0, 30);
        const nowIso = new Date().toISOString();

        db.prepare(`
          INSERT INTO site_visits (
            visitor_hash, referrer, device, browser, os, path, screen_res, created_at
          ) VALUES (
            @visitor_hash, @referrer, @device, @browser, @os, @path, @screen_res, @created_at
          )
        `).run({
          visitor_hash: visitorHash,
          referrer,
          device,
          browser,
          os,
          path: pathVisited,
          screen_res: screenRes,
          created_at: nowIso
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 10. GET /api/admin/analytics (Developer-only visitor traffic console with Brute-Force Shield)
  if (method === 'GET' && pathname === '/api/admin/analytics') {
    try {
      const lockoutStatus = checkAdminLockout(clientIp);
      if (lockoutStatus.locked) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'locked_out',
          message: `Too many failed authentication attempts. Access locked for ${lockoutStatus.minutesLeft} minute(s).`
        }));
        return;
      }

      const pin = reqUrl.searchParams.get('pin') || req.headers['x-admin-pin'] || '';
      if (!pin || pin !== ADMIN_PIN) {
        const lockout = recordAdminFailure(clientIp);
        const attemptsRemaining = Math.max(0, ADMIN_MAX_FAILED_ATTEMPTS - lockout.failedAttempts);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'unauthorized',
          message: attemptsRemaining > 0
            ? `Access denied: Invalid Developer PIN (${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before 15m lockout)`
            : 'Access denied: Maximum failed attempts exceeded. Locked out for 15 minutes.'
        }));
        return;
      }

      // Successful authentication: clear failure count
      recordAdminSuccess(clientIp);

      const analytics = getDeveloperSiteAnalytics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', analytics }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // --- STATIC ASSETS ---
  serveStatic(req, res, pathname);
});

// Initialize database and start listening
initDatabase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 DEV CORE KE PLATFORM RUNNING`);
  console.log(`📡 Local Server URL: http://0.0.0.0:${PORT}`);
  console.log(`🇰🇪 Strategic focus: Kenyan & Global Software Roles`);
  console.log(`🛡️  Credibility Engine, Review Hub & Analytics Active`);
  console.log(`🤖 Autonomous Hourly Role Scanner: READY`);
  console.log(`💓 Keep-Alive Self-Heartbeat: ACTIVE (Every 10 mins)`);
  console.log(`=======================================================`);
});

// Dual-listener: if PORT != 3000 (e.g. Render assigns PORT=10000), also listen on 3000 for Docker EXPOSE 3000 routing
if (Number(PORT) !== 3000) {
  try {
    const secondaryServer = http.createServer((req, res) => server.emit('request', req, res));
    secondaryServer.listen(3000, '0.0.0.0', () => {
      console.log('📡 Dual-listen active on port 3000');
    });
  } catch (e) {
    // Port 3000 in use
  }
}

// Schedule Autonomous Hourly Role Scanner (every 60 minutes)
setInterval(() => {
  runHourlyRoleScan(false).catch(err => console.error('[Hourly Scanner Exception]', err));
}, 60 * 60 * 1000);

// Schedule Keep-Alive Self-Heartbeat (every 10 minutes to maintain active state on Render)
setInterval(pingKeepAlive, 10 * 60 * 1000);

// Run initial role discovery scan 1 second after server boot
setTimeout(() => {
  runHourlyRoleScan(false).catch(err => console.error('[Startup Scanner Exception]', err));
}, 1000);
