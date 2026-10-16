// DEV CORE KE - Client Application Logic
let searchDebounceTimer = null;
let currentJobs = [];

document.addEventListener('DOMContentLoaded', () => {
  recordPageVisit();
  loadJobs();
  loadRolesMatrix();
  loadAnalytics();
  loadReviews();
  loadScannerStatus();
  setInterval(loadScannerStatus, 45000);
});

// Tab Switcher
function switchTab(tabName) {
  const tabs = ['jobs', 'credibility', 'matrix', 'reviews', 'analytics'];
  tabs.forEach(t => {
    const section = document.getElementById(`section-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    const mobBtn = document.getElementById(`mob-tab-btn-${t}`);
    if (section) {
      if (t === tabName) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
    if (mobBtn) {
      if (t === tabName) {
        mobBtn.classList.add('active-mobile-tab');
      } else {
        mobBtn.classList.remove('active-mobile-tab');
      }
    }
  });

  // Refresh relevant data when tab becomes active
  if (tabName === 'reviews') loadReviews();
  if (tabName === 'analytics') loadAnalytics();
  if (tabName === 'matrix') loadRolesMatrix();
  if (tabName === 'jobs') loadJobs();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update dynamic LinkedIn Live Search URL based on filters
function updateLinkedInSearchUrl() {
  const q = document.getElementById('filter-search')?.value.trim() || '';
  const seniority = document.getElementById('filter-seniority')?.value || 'all';
  const loc = document.getElementById('filter-location')?.value || 'all';

  let term = q || 'Software Engineer';
  if (seniority && seniority !== 'all') {
    term += ` ${seniority}`;
  }

  let targetUrl = '';
  if (loc === 'Worldwide Remote') {
    targetUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&f_WT=2`;
  } else {
    targetUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&location=Kenya`;
  }

  const btn = document.getElementById('btn-linkedin-live-search');
  if (btn) btn.href = targetUrl;
}

// Debounce for search
function handleSearchDebounced() {
  updateLinkedInSearchUrl();
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadJobs();
  }, 300);
}

// Quick filter helpers
function quickFilterSeniority(val) {
  document.getElementById('filter-seniority').value = val;
  updateLinkedInSearchUrl();
  loadJobs();
}

function quickFilterLocation(val) {
  document.getElementById('filter-location').value = val;
  loadJobs();
}

function quickFilterDate(range) {
  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect) {
    sortSelect.value = range === 'today' ? 'today' : (range === 'week' ? 'week' : 'newest');
  }
  loadJobs();
}

// Load Jobs from API
async function loadJobs() {
  const grid = document.getElementById('jobs-grid');
  const countBadge = document.getElementById('jobs-count-badge');
  const q = document.getElementById('filter-search')?.value || '';
  const seniority = document.getElementById('filter-seniority')?.value || 'all';
  const domain = document.getElementById('filter-domain')?.value || 'all';
  const location_type = document.getElementById('filter-location')?.value || 'all';
  const min_credibility = document.getElementById('filter-credibility')?.value || '0';
  const sort = document.getElementById('filter-sort')?.value || 'newest';

  const params = new URLSearchParams({
    q,
    seniority,
    domain,
    location_type,
    min_credibility,
    sort
  });

  try {
    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    currentJobs = data.jobs || [];

    if (countBadge) {
      countBadge.textContent = `${currentJobs.length} Roles Active`;
    }

    if (!currentJobs.length) {
      grid.innerHTML = `
        <div class="col-span-full bg-surface-850 border border-surface-700 rounded-2xl p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-surface-800 text-slate-500 mx-auto flex items-center justify-center text-2xl mb-4">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 class="text-lg font-bold text-white">No Matching Roles Found</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search query, lowering the minimum credibility score threshold, or resetting the seniority level.
          </p>
          <button onclick="resetFilters()" class="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">
            Reset Filters
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = currentJobs.map(job => renderJobCard(job)).join('');
  } catch (err) {
    console.error('Error loading jobs:', err);
    grid.innerHTML = `<div class="col-span-full p-8 text-center text-rose-400">Failed to load roles. Server might be restarting.</div>`;
  }
}

function resetFilters() {
  if (document.getElementById('filter-search')) document.getElementById('filter-search').value = '';
  if (document.getElementById('filter-seniority')) document.getElementById('filter-seniority').value = 'all';
  if (document.getElementById('filter-domain')) document.getElementById('filter-domain').value = 'all';
  if (document.getElementById('filter-location')) document.getElementById('filter-location').value = 'all';
  if (document.getElementById('filter-sort')) document.getElementById('filter-sort').value = 'newest';
  if (document.getElementById('filter-credibility')) {
    document.getElementById('filter-credibility').value = '0';
    document.getElementById('credibility-val').innerText = '0+';
  }
  loadJobs();
}

// Smart Application Link Resolver
function getApplyLinkData(job) {
  const isScam = job.scam_risk === 'HIGH' || job.credibility_score < 40;
  if (isScam) {
    return {
      href: `javascript:openJobDetail(${job.id})`,
      target: '_self',
      label: 'Flag Scam',
      modalLabel: 'Flag Scam (View Warnings)',
      icon: 'fa-solid fa-triangle-exclamation',
      btnClass: 'bg-rose-600 hover:bg-rose-500 text-white'
    };
  }

  let url = (job.apply_url || '').trim();

  // If already an email mailto link
  if (url.startsWith('mailto:')) {
    return {
      href: url,
      target: '_self',
      label: 'Apply via Email',
      modalLabel: 'Send Application Email',
      icon: 'fa-regular fa-envelope',
      btnClass: 'bg-brand-600 hover:bg-brand-500 text-white'
    };
  }

  // If standard web URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return {
      href: url,
      target: '_blank',
      label: 'Apply',
      modalLabel: 'Apply on Official Portal',
      icon: 'fa-solid fa-arrow-up-right-from-square',
      btnClass: 'bg-brand-600 hover:bg-brand-500 text-white'
    };
  }

  // If URL lacks scheme but is a domain (e.g., "company.co.ke/careers")
  if (url && url.includes('.')) {
    return {
      href: `https://${url.replace(/^\/+/, '')}`,
      target: '_blank',
      label: 'Apply',
      modalLabel: 'Apply on Official Portal',
      icon: 'fa-solid fa-arrow-up-right-from-square',
      btnClass: 'bg-brand-600 hover:bg-brand-500 text-white'
    };
  }

  // Fallback 1: Company Domain
  const domain = (job.company_domain || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (domain && domain.includes('.')) {
    return {
      href: `https://${domain}`,
      target: '_blank',
      label: 'Apply (Site)',
      modalLabel: `Visit ${domain}`,
      icon: 'fa-solid fa-globe',
      btnClass: 'bg-brand-600 hover:bg-brand-500 text-white'
    };
  }

  // Fallback 2: Contact Email
  const email = (job.contact_email || '').trim();
  if (email && email.includes('@')) {
    return {
      href: `mailto:${email}?subject=Application%20for%20${encodeURIComponent(job.title)}%20at%20${encodeURIComponent(job.company)}`,
      target: '_self',
      label: 'Apply via Email',
      modalLabel: `Email Recruiter (${email})`,
      icon: 'fa-regular fa-envelope',
      btnClass: 'bg-brand-600 hover:bg-brand-500 text-white'
    };
  }

  // Fallback 3: View Details in modal
  return {
    href: `javascript:openJobDetail(${job.id})`,
    target: '_self',
    label: 'Details',
    modalLabel: 'Contact Recruiter Directly',
    icon: 'fa-solid fa-circle-info',
    btnClass: 'bg-slate-700 hover:bg-slate-600 text-white'
  };
}

// Render Individual Job Card
function renderJobCard(job) {
  const seniorityLabelMap = {
    attachment: 'Industrial Attachment (University/NITA)',
    internship: 'Intern / Graduate Trainee',
    junior: 'Junior Developer (0-2 Yrs)',
    mid: 'Mid-Level Engineer (2-5 Yrs)',
    senior: 'Senior / Staff Engineer (5+ Yrs)',
    lead_manager: 'Lead Manager / Eng Manager',
    cto: 'Chief Technology Officer (CTO)'
  };

  const domainLabelMap = {
    fullstack: 'Fullstack',
    frontend: 'Frontend',
    backend: 'Backend & Microservices',
    mobile: 'Mobile (Flutter / Kotlin / iOS)',
    devops_cloud: 'DevOps & Cloud / SRE',
    ai_ml_data: 'AI & Data Science',
    cybersecurity: 'Cybersecurity & CBK Compliance',
    qa_testing: 'QA & Test Automation'
  };

  const isScam = job.scam_risk === 'HIGH' || job.credibility_score < 40;
  const isModerate = job.scam_risk === 'MODERATE' || (job.credibility_score >= 40 && job.credibility_score < 75);

  let credibilityBadge = '';
  if (isScam) {
    credibilityBadge = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs animate-pulse">
        <i class="fa-solid fa-triangle-exclamation text-rose-700"></i> HIGH SCAM RISK (${job.credibility_score}/100)
      </span>
    `;
  } else if (isModerate) {
    credibilityBadge = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
        <i class="fa-solid fa-circle-exclamation text-amber-700"></i> Moderate Trust (${job.credibility_score}/100)
      </span>
    `;
  } else {
    credibilityBadge = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
        <i class="fa-solid fa-shield-check text-emerald-700"></i> Verified Legit (${job.credibility_score}/100)
      </span>
    `;
  }

// Format Posting Date with relative distance and calendar date
function formatPostedDate(dateStr) {
  if (!dateStr) {
    return {
      label: 'Recent Opening',
      relative: 'Recently',
      fullDate: 'Recently Posted',
      badgeClass: 'text-slate-800 bg-surface-800 border border-slate-300',
      icon: 'fa-regular fa-clock text-slate-600',
      isFresh: false
    };
  }

  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-').map(Number);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const postYear = parts[0];
  const postMonth = parts[1] - 1;
  const postDay = parts[2];
  
  const postDate = (postYear && parts[1] && postDay) ? new Date(postYear, postMonth, postDay) : new Date(dateStr);
  const fullDate = (postYear && parts[1] && postDay) 
    ? `${monthNames[postMonth]} ${postDay}, ${postYear}` 
    : cleanStr;

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const postDateStart = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
  
  const diffTime = todayDate.getTime() - postDateStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      label: 'Added Today',
      relative: 'Today',
      fullDate,
      badgeClass: 'text-sky-950 bg-sky-100 border border-sky-300 shadow-2xs',
      icon: 'fa-solid fa-sparkles text-sky-600',
      isFresh: true
    };
  } else if (diffDays === 1) {
    return {
      label: 'Yesterday',
      relative: 'Yesterday',
      fullDate,
      badgeClass: 'text-emerald-950 bg-emerald-100 border border-emerald-300 shadow-2xs',
      icon: 'fa-regular fa-calendar-check text-emerald-700',
      isFresh: true
    };
  } else if (diffDays <= 7) {
    return {
      label: `${diffDays}d ago`,
      relative: `${diffDays} days ago`,
      fullDate,
      badgeClass: 'text-indigo-950 bg-indigo-100 border border-indigo-300 shadow-2xs',
      icon: 'fa-regular fa-calendar text-indigo-600',
      isFresh: true
    };
  } else if (diffDays <= 14) {
    return {
      label: `${Math.round(diffDays / 7)}w ago`,
      relative: `${Math.round(diffDays / 7)} weeks ago`,
      fullDate,
      badgeClass: 'text-slate-800 bg-surface-800 border border-slate-300 shadow-2xs',
      icon: 'fa-regular fa-clock text-slate-600',
      isFresh: false
    };
  } else {
    return {
      label: fullDate,
      relative: `${diffDays}d ago`,
      fullDate,
      badgeClass: 'text-slate-800 bg-surface-800 border border-slate-300 shadow-2xs',
      icon: 'fa-regular fa-calendar-days text-slate-500',
      isFresh: false
    };
  }
}

// Sanitizes and strips all raw HTML tags to prevent DOM corruption
function cleanText(str) {
  if (!str) return '';
  return String(str)
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

  // Formatting salary
  let salaryDisplay = '';
  if (job.currency_display === 'USD' && job.salary_usd_min) {
    salaryDisplay = `$${job.salary_usd_min.toLocaleString()} - $${job.salary_usd_max.toLocaleString()} / mo`;
  } else if (job.salary_kes_min) {
    salaryDisplay = `KES ${job.salary_kes_min.toLocaleString()} - ${job.salary_kes_max.toLocaleString()} / mo`;
  } else {
    salaryDisplay = 'Disclosed upon interview';
  }

  const tags = (job.tags || '').split(',').filter(Boolean);
  const dateInfo = formatPostedDate(job.posted_date);
  const cleanDesc = cleanText(job.description);
  const isLinkedIn = (job.tags || '').includes('LinkedIn') || (job.company_domain || '').includes('linkedin') || (job.apply_url || '').includes('linkedin.com');
  const applyAction = getApplyLinkData(job);

  return `
    <div class="job-card bg-surface-850 border ${isScam ? 'border-rose-500/40' : 'border-surface-700/80'} rounded-2xl p-5 flex flex-col">
      <div>
        <!-- Top Metadata & Credibility Badge -->
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold badge-${job.seniority}">
              ${seniorityLabelMap[job.seniority] || job.seniority}
            </span>
            <span class="job-date-badge ${dateInfo.badgeClass}" title="Posted on ${dateInfo.fullDate}">
              <i class="${dateInfo.icon}"></i> ${dateInfo.label}
            </span>
            ${job.original_job_id ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-800 text-brand-700 border border-brand-300/80 shadow-2xs" title="Official Employer Requisition ID"><i class="fa-solid fa-fingerprint text-brand-600"></i> #${job.original_job_id}</span>` : ''}
          </div>
          ${credibilityBadge}
        </div>

        <!-- Job Title and Company -->
        <h3 class="text-base font-bold text-white leading-snug hover:text-brand-400 transition cursor-pointer" onclick="openJobDetail(${job.id})">
          ${job.title}
        </h3>
        
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-700">
          <span class="font-bold text-slate-900 flex items-center gap-1">
            <i class="fa-regular fa-building text-slate-600"></i> ${job.company}
          </span>
          <span class="job-date-meta" title="Date Published: ${dateInfo.fullDate}">
            <i class="fa-regular fa-calendar-days"></i> Posted ${dateInfo.fullDate}
          </span>
          ${isLinkedIn ? '<span class="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#0A66C2] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shadow-2xs"><i class="fa-brands fa-linkedin text-[#0A66C2]"></i> LinkedIn</span>' : ''}
          ${job.brs_verified ? '<span class="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded shadow-2xs"><i class="fa-solid fa-circle-check text-emerald-700"></i> BRS Reg</span>' : ''}
          <span class="flex items-center gap-1 text-slate-700 font-medium">
            <i class="fa-solid fa-location-dot text-slate-600"></i> ${job.location}
          </span>
          <span class="job-domain-badge">
            <i class="fa-solid fa-laptop-code"></i> ${domainLabelMap[job.domain] || job.domain}
          </span>
        </div>

        <!-- Excerpt with clean clamping -->
        <p class="job-desc-clamp text-xs mt-3 leading-relaxed">
          ${cleanDesc}
        </p>

        <!-- Tags -->
        <div class="flex flex-wrap gap-1.5 mt-3.5">
          ${tags.map(t => `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-900 text-slate-300 border border-surface-750">${t.trim()}</span>`).join('')}
        </div>
      </div>

      <!-- Card Bottom: Salary & Actions (Directly below tags, responsive wrap) -->
      <div class="mt-4 pt-3.5 border-t border-surface-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span class="text-slate-600 font-mono block text-[10px] font-bold">COMPENSATION:</span>
          <span class="font-extrabold font-mono ${isScam ? 'text-rose-900' : 'text-emerald-950'} text-xs sm:text-sm">
            ${salaryDisplay}
          </span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <a 
            href="https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.company + ' ' + job.title)}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0A66C2] border border-blue-200 font-bold transition inline-flex items-center gap-1 cursor-pointer text-xs"
            title="Search for this opening and recruiter on LinkedIn"
          >
            <i class="fa-brands fa-linkedin"></i>
            <span>LinkedIn</span>
          </a>
          <button 
            onclick="openJobDetail(${job.id})" 
            class="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-800 border border-surface-650 font-semibold transition cursor-pointer"
          >
            Details
          </button>
          <a 
            href="${applyAction.href}" 
            ${applyAction.target ? `target="${applyAction.target}"` : ''} 
            rel="noopener noreferrer"
            class="px-3.5 py-1.5 rounded-lg ${applyAction.btnClass} font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <i class="${applyAction.icon}"></i>
            <span>${applyAction.label}</span>
          </a>
        </div>
      </div>
    </div>
  `;
}

// Open Job Detail Modal
function openJobDetail(id) {
  const job = currentJobs.find(j => j.id === id);
  if (!job) return;

  const modal = document.getElementById('modal-job-detail');
  const container = document.getElementById('job-detail-content');

  const isScam = job.scam_risk === 'HIGH' || job.credibility_score < 40;
  const applyAction = getApplyLinkData(job);
  const dateInfo = formatPostedDate(job.posted_date);

  container.innerHTML = `
    <div>
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2.5 py-1 rounded text-xs font-mono font-bold badge-${job.seniority}">
            ${job.seniority.toUpperCase()} ROLE
          </span>
          ${job.original_job_id ? `<span class="px-2.5 py-1 rounded text-xs font-mono font-bold bg-surface-800 text-brand-300 border border-brand-500/40 shadow-2xs"><i class="fa-solid fa-fingerprint text-brand-400 mr-1"></i> Req ID: #${job.original_job_id}</span>` : ''}
        </div>
        <span class="text-xs font-mono ${isScam ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
          Credibility Trust Index: ${job.credibility_score} / 100
        </span>
      </div>

      <h2 class="text-xl font-extrabold text-white leading-tight mt-1">
        ${job.title}
      </h2>

      <div class="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2 pb-4 border-b border-surface-750">
        <span class="font-bold text-white"><i class="fa-solid fa-building text-brand-500 mr-1"></i> ${job.company}</span>
        <span><i class="fa-solid fa-globe text-blue-700 mr-1"></i> ${job.company_domain || 'Unverified domain'}</span>
        <span><i class="fa-solid fa-map-pin text-rose-400 mr-1"></i> ${job.location} (${job.location_type})</span>
        <span class="job-date-meta" title="Date Published: ${dateInfo.fullDate}">
          <i class="fa-regular fa-calendar-check text-brand-600"></i> Posted: ${dateInfo.fullDate} (${dateInfo.relative})
        </span>
      </div>

      ${isScam ? `
        <div class="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs">
          <div class="font-bold text-sm flex items-center gap-1.5 text-rose-400">
            <i class="fa-solid fa-triangle-exclamation"></i> CRITICAL WARNING: High Scam / Phishing Alert
          </div>
          <p class="mt-1">
            This job offer failed the DevCircle Credibility Audit. It either requests upfront fees via M-Pesa, uses an unverified domain, or offers unrealistic compensation. Never send money for job interviews in Kenya!
          </p>
        </div>
      ` : `
        <div class="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
          <div>
            <span class="font-bold text-emerald-400"><i class="fa-solid fa-circle-check"></i> Credibility Verified</span>: Entity registered, genuine technical interview process, compliant with Kenyan labor standards.
          </div>
          <button onclick="prefillAuditForJob('${escape(job.company)}', '${escape(job.company_domain || '')}', '${escape(job.contact_email || '')}')" class="text-xs px-2.5 py-1 bg-surface-800 text-white rounded hover:bg-surface-700 border border-surface-600 shrink-0 ml-2">
            Audit Deeply
          </button>
        </div>
      `}

      <!-- Description -->
      <div class="mt-5 space-y-4 text-xs sm:text-sm text-slate-300">
        <div>
          <h4 class="font-bold text-white text-xs uppercase tracking-wider font-mono text-slate-400 mb-1">About This Role</h4>
          <p class="leading-relaxed bg-surface-900 p-3.5 rounded-xl border border-surface-750">${cleanText(job.description)}</p>
        </div>

        <div>
          <h4 class="font-bold text-white text-xs uppercase tracking-wider font-mono text-slate-400 mb-1">Candidate Requirements</h4>
          <p class="leading-relaxed bg-surface-900 p-3.5 rounded-xl border border-surface-750">${cleanText(job.requirements) || 'Standard computer science degree or demonstrable portfolio.'}</p>
        </div>

        <div>
          <h4 class="font-bold text-white text-xs uppercase tracking-wider font-mono text-slate-400 mb-1">Benefits & Perks for Kenyan Engineers</h4>
          <p class="leading-relaxed bg-surface-900 p-3.5 rounded-xl border border-surface-750">${cleanText(job.benefits) || 'Standard health cover, hardware allowance, flexible leave.'}</p>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="mt-6 pt-4 border-t border-surface-750 flex flex-wrap justify-between items-center gap-3">
        <div>
          <span class="text-[11px] text-slate-400 block font-mono">ESTIMATED COMPENSATION:</span>
          <span class="text-base font-bold font-mono text-emerald-400">
            ${job.currency_display === 'USD' ? `$${job.salary_usd_min} - $${job.salary_usd_max} / month` : `KES ${job.salary_kes_min?.toLocaleString()} - ${job.salary_kes_max?.toLocaleString()} / month`}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="closeModal('modal-job-detail')" class="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold cursor-pointer">
            Close
          </button>
          <a href="${applyAction.href}" ${applyAction.target ? `target="${applyAction.target}"` : ''} rel="noopener noreferrer" class="px-5 py-2 rounded-xl ${applyAction.btnClass} text-xs font-bold shadow-lg inline-flex items-center gap-2 cursor-pointer">
            <i class="${applyAction.icon}"></i>
            <span>${applyAction.modalLabel}</span>
          </a>
        </div>
      </div>
    </div>
  `;

  openModal('modal-job-detail');
}

function prefillAuditForJob(company, domain, email) {
  closeModal('modal-job-detail');
  switchTab('credibility');
  document.getElementById('audit-company').value = unescape(company);
  document.getElementById('audit-domain').value = unescape(domain);
  document.getElementById('audit-email').value = unescape(email);
}

// Credibility Audit Execution
async function handleRunAudit(e) {
  e.preventDefault();
  const company_name = document.getElementById('audit-company').value;
  const domain = document.getElementById('audit-domain').value;
  const contact_email = document.getElementById('audit-email').value;
  const requires_fee = document.getElementById('audit-fee').checked;
  const job_text = document.getElementById('audit-text').value;

  const resultBox = document.getElementById('audit-result-box');
  resultBox.classList.remove('hidden');
  resultBox.innerHTML = `
    <div class="p-8 text-center text-slate-400">
      <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-500 mb-2"></i>
      <div>Cross-referencing Kenyan BRS registry, domain SSL, and anti-fraud signatures...</div>
    </div>
  `;

  try {
    const res = await fetch('/api/credibility-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name, domain, contact_email, requires_fee, job_text })
    });
    const data = await res.json();
    const audit = data.audit;

    renderAuditResult(audit, company_name);
  } catch (err) {
    resultBox.innerHTML = `<div class="p-4 text-rose-400">Audit failed to execute. Check server connection.</div>`;
  }
}

function renderAuditResult(audit, companyName) {
  const resultBox = document.getElementById('audit-result-box');
  const score = audit.score;
  const isHighRisk = audit.verdict === 'HIGH_RISK_SCAM';
  const isModerate = audit.verdict === 'MODERATE_VERIFY_FURTHER';

  let borderColor = isHighRisk ? 'border-rose-500 bg-rose-950/20' : (isModerate ? 'border-amber-500 bg-amber-950/20' : 'border-emerald-500 bg-emerald-950/20');
  let scoreColor = isHighRisk ? 'text-rose-400' : (isModerate ? 'text-amber-400' : 'text-emerald-400');
  let verdictText = isHighRisk ? 'HIGH SCAM RISK DETECTED' : (isModerate ? 'MODERATE RISK - VERIFY CAREFULLY' : 'LEGITIMATE & VERIFIED SAFE');

  resultBox.className = `mt-8 border-2 rounded-2xl p-6 transition-all ${borderColor}`;
  resultBox.innerHTML = `
    <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-surface-700/80 pb-4">
      <div>
        <div class="text-xs font-mono text-slate-400">CREDIBILITY VERDICT FOR: <strong class="text-white">${companyName}</strong></div>
        <div class="text-xl sm:text-2xl font-extrabold ${scoreColor} mt-1 flex items-center gap-2">
          ${isHighRisk ? '<i class="fa-solid fa-ban"></i>' : (isModerate ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-shield-check"></i>')}
          ${verdictText}
        </div>
      </div>

      <div class="text-right sm:border-l sm:border-surface-700 sm:pl-6">
        <div class="text-[11px] font-mono text-slate-400">TRUST SCORE</div>
        <div class="text-3xl font-black font-mono ${scoreColor}">
          ${score}<span class="text-sm text-slate-500">/100</span>
        </div>
      </div>
    </div>

    <!-- Progress Meter -->
    <div class="w-full bg-surface-900 rounded-full h-3 mt-4 overflow-hidden border border-surface-700">
      <div class="meter-fill h-full rounded-full ${isHighRisk ? 'bg-rose-500' : (isModerate ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${score}%;"></div>
    </div>

    <!-- Red Flags -->
    ${audit.red_flags.length ? `
      <div class="mt-5">
        <h4 class="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
          <i class="fa-solid fa-triangle-exclamation"></i> Critical Red Flags Identified (${audit.red_flags.length})
        </h4>
        <ul class="space-y-1.5 text-xs text-rose-200">
          ${audit.red_flags.map(f => `<li class="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-start gap-2"><i class="fa-solid fa-xmark text-rose-400 mt-0.5"></i> <span>${f}</span></li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Strengths -->
    ${audit.strengths.length ? `
      <div class="mt-5">
        <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
          <i class="fa-solid fa-check"></i> Positive Legitimacy Signals (${audit.strengths.length})
        </h4>
        <ul class="space-y-1.5 text-xs text-emerald-200">
          ${audit.strengths.map(s => `<li class="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2"><i class="fa-solid fa-check text-emerald-400 mt-0.5"></i> <span>${s}</span></li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Kenyan Law Advice -->
    <div class="mt-5 pt-4 border-t border-surface-700/80 text-xs text-slate-300 flex items-start gap-2">
      <i class="fa-solid fa-gavel text-amber-400 mt-0.5"></i>
      <div>
        <strong class="text-white">Kenyan Employment Act 2007 Notice:</strong> Charging candidates any fee to apply or attend interviews is strictly prohibited under Kenyan Law. If you are asked to send M-Pesa to an agent or buy a "badge", report it to DCI Cybercrime Unit.
      </div>
    </div>
  `;
}

function loadSampleScamAudit() {
  document.getElementById('audit-company').value = "Swift Global Data Recruiters";
  document.getElementById('audit-domain').value = "swiftcareers-kenya.xyz";
  document.getElementById('audit-email').value = "swift.recruiter.hr@gmail.com";
  document.getElementById('audit-fee').checked = true;
  document.getElementById('audit-text').value = "Congratulations! You have been selected for an online junior Python remote position with KES 450,000 monthly salary, no experience required. Please send KES 2,800 to M-Pesa Till number 923821 for candidate interview processing badge and MacBook delivery fee.";
}

function loadSampleSafeAudit() {
  document.getElementById('audit-company').value = "Safaricom PLC";
  document.getElementById('audit-domain').value = "safaricom.co.ke";
  document.getElementById('audit-email').value = "careers@safaricom.co.ke";
  document.getElementById('audit-fee').checked = false;
  document.getElementById('audit-text').value = "Safaricom is recruiting Software Engineers for our Digital Innovation Hub. Responsibilities include maintaining M-Pesa transaction gateways, microservices integration, and cloud deployment. Formal technical interview rounds including coding screen and system design. Zero application fee.";
}

// Load CS Career Matrix
async function loadRolesMatrix() {
  const container = document.getElementById('roles-matrix-container');
  if (!container) return;

  try {
    const res = await fetch('/api/roles-guide');
    const data = await res.json();
    const guide = data.guide || [];

    const badgeColorMap = {
      attachment: 'border-sky-500/40 bg-sky-950/20 text-sky-400',
      internship: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400',
      junior: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
      mid: 'border-teal-500/40 bg-teal-950/20 text-teal-400',
      senior: 'border-purple-500/40 bg-purple-950/20 text-purple-400',
      lead_manager: 'border-amber-500/40 bg-amber-950/20 text-amber-400',
      cto: 'border-rose-500/40 bg-rose-950/20 text-rose-400'
    };

    container.innerHTML = guide.map(item => `
      <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6 transition-all hover:border-surface-600">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-surface-750 pb-4">
          <div>
            <span class="px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${badgeColorMap[item.seniority] || 'badge-mid'}">
              ${item.seniority.toUpperCase()} LEVEL
            </span>
            <h3 class="text-xl font-bold text-white mt-1.5">${item.title}</h3>
          </div>
          <div class="text-left sm:text-right">
            <span class="text-[11px] font-mono text-slate-400 block">TYPICAL KENYAN REMUNERATION:</span>
            <span class="text-base font-extrabold font-mono text-emerald-400">${item.typical_stipend_kenya}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div class="p-3.5 bg-surface-900 rounded-xl border border-surface-800">
            <span class="font-bold text-slate-200 block mb-1"><i class="fa-solid fa-users-viewfinder text-blue-700 mr-1"></i> Who is it for:</span>
            <p class="text-slate-400">${item.who_is_it_for}</p>
          </div>
          <div class="p-3.5 bg-surface-900 rounded-xl border border-surface-800">
            <span class="font-bold text-slate-200 block mb-1"><i class="fa-solid fa-list-check text-emerald-400 mr-1"></i> Day-to-Day Responsibilities:</span>
            <p class="text-slate-400">${item.key_responsibilities}</p>
          </div>
          <div class="p-3.5 bg-surface-900 rounded-xl border border-surface-800">
            <span class="font-bold text-slate-200 block mb-1"><i class="fa-solid fa-scale-balanced text-amber-400 mr-1"></i> Statutory & Kenyan Legal Framework:</span>
            <p class="text-slate-400">${item.statutory_rules}</p>
          </div>
          <div class="p-3.5 bg-surface-900 rounded-xl border border-surface-800">
            <span class="font-bold text-slate-200 block mb-1"><i class="fa-solid fa-rocket text-purple-400 mr-1"></i> Strategic Pathway to Break In:</span>
            <p class="text-slate-400">${item.how_to_break_in}</p>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading roles matrix:', err);
  }
}

// Load Reviews
async function loadReviews() {
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;
  const company = document.getElementById('filter-review-company')?.value || '';

  try {
    const res = await fetch(`/api/reviews?company=${encodeURIComponent(company)}`);
    const data = await res.json();
    const reviews = data.reviews || [];

    if (!reviews.length) {
      grid.innerHTML = `
        <div class="col-span-full bg-surface-850 p-8 rounded-2xl text-center text-slate-400 text-xs">
          No reviews found for this company. Be the first Kenyan developer to leave a review!
        </div>
      `;
      return;
    }

    grid.innerHTML = reviews.map(r => `
      <div class="bg-surface-850 border border-surface-700 rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start gap-2">
            <div>
              <h4 class="font-bold text-white text-base">${r.company_name}</h4>
              <div class="text-xs text-slate-400">${r.role} • <span class="capitalize text-slate-300 font-mono">${r.seniority}</span></div>
            </div>
            <div class="flex text-amber-400 text-xs">
              ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 mt-3 p-2 bg-surface-900 rounded-lg text-[11px] text-center border border-surface-750">
            <div>
              <span class="text-slate-500 block text-[10px]">CULTURE</span>
              <span class="font-bold text-slate-200">${r.culture_rating}/5</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">SALARY</span>
              <span class="font-bold text-slate-200">${r.salary_rating}/5</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">TIMELY PAY</span>
              <span class="font-bold text-emerald-400">${r.timely_pay_mpesa_bank}</span>
            </div>
          </div>

          <div class="mt-3.5 space-y-2 text-xs">
            <div class="text-slate-300">
              <strong class="text-emerald-400">Pros:</strong> ${r.pros}
            </div>
            <div class="text-slate-300">
              <strong class="text-rose-400">Cons:</strong> ${r.cons}
            </div>
            ${r.interview_experience ? `
              <div class="text-slate-400 text-[11px] italic pt-1 border-t border-surface-750">
                <i class="fa-solid fa-clipboard-question mr-1 text-blue-700"></i> Interview: ${r.interview_experience}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-surface-750 flex justify-between items-center text-[11px] text-slate-500 font-mono">
          <span><i class="fa-solid fa-user-check text-emerald-500 mr-1"></i> Verified Kenyan Dev</span>
          <span>${r.created_at}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

// Handle Submit Review
async function handleReviewSubmit(e) {
  e.preventDefault();
  const company_name = document.getElementById('rev-company').value;
  const role = document.getElementById('rev-role').value;
  const seniority = document.getElementById('rev-seniority').value;
  const rating = document.getElementById('rev-rating').value;
  const culture_rating = document.getElementById('rev-culture').value;
  const timely_pay_mpesa_bank = document.getElementById('rev-timely-pay').value;
  const pros = document.getElementById('rev-pros').value;
  const cons = document.getElementById('rev-cons').value;
  const interview_experience = document.getElementById('rev-interview').value;

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name, role, seniority, rating, culture_rating,
        timely_pay_mpesa_bank, pros, cons, interview_experience
      })
    });
    if (res.ok) {
      closeModal('modal-write-review');
      document.getElementById('review-form').reset();
      switchTab('reviews');
      loadReviews();
      alert('Review posted anonymously! Thank you for empowering Kenyan engineers.');
    }
  } catch (err) {
    alert('Error submitting review.');
  }
}

// Handle Post Job
async function handlePostJob(e) {
  e.preventDefault();
  const title = document.getElementById('post-title').value;
  const company = document.getElementById('post-company').value;
  const seniority = document.getElementById('post-seniority').value;
  const domain = document.getElementById('post-domain').value;
  const location_type = document.getElementById('post-location-type').value;
  const salary_kes_min = document.getElementById('post-salary-min').value || 50000;
  const salary_kes_max = document.getElementById('post-salary-max').value || 100000;
  const company_domain = document.getElementById('post-domain-site').value;
  const contact_email = document.getElementById('post-email').value;
  const apply_url = document.getElementById('post-apply-url')?.value || '';
  const description = document.getElementById('post-desc').value;
  const requirements = document.getElementById('post-reqs').value;

  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, company, seniority, domain, location_type,
        salary_kes_min, salary_kes_max, company_domain,
        contact_email, apply_url, description, requirements
      })
    });
    if (res.ok) {
      closeModal('modal-post-job');
      document.getElementById('post-job-form').reset();
      switchTab('jobs');
      loadJobs();
      alert('Job posted and verified through the Credibility Engine!');
    }
  } catch (err) {
    alert('Failed to post job offer.');
  }
}

// Load Analytics & Salary Table
async function loadAnalytics() {
  const tableBody = document.getElementById('salary-table-body');
  const skillsContainer = document.getElementById('skills-demand-bars');
  if (!tableBody || !skillsContainer) return;

  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    const analytics = data.analytics;

    // Render Salary Table
    tableBody.innerHTML = analytics.salary_benchmarks.map(row => `
      <tr class="hover:bg-surface-800/50 transition">
        <td class="py-3 px-4 font-bold text-white flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-brand-500"></span>
          ${row.level}
        </td>
        <td class="py-3 px-4 font-mono font-bold text-emerald-400">${row.avg_kes}</td>
        <td class="py-3 px-4 font-mono text-teal-300">${row.avg_usd}</td>
        <td class="py-3 px-4 text-slate-400 font-mono text-xs">${row.typical_duration}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-mono ${row.nita_accredited === 'Yes' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-surface-800 text-slate-400'}">
            ${row.nita_accredited}
          </span>
        </td>
        <td class="py-3 px-4 text-slate-300 text-xs">${row.focus}</td>
      </tr>
    `).join('');

    // Render In-Demand Skills Bars
    skillsContainer.innerHTML = analytics.in_demand_skills.map(skill => `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="font-bold text-slate-200">${skill.name} <span class="text-slate-500 font-mono text-[11px]">(${skill.category})</span></span>
          <span class="font-mono text-brand-400 font-bold">${skill.demand}% demand</span>
        </div>
        <div class="w-full bg-surface-900 rounded-full h-2 overflow-hidden border border-surface-750">
          <div class="h-full bg-gradient-to-r from-brand-600 to-teal-400 rounded-full" style="width: ${skill.demand}%"></div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }
}

// ============================================================================
// 🤖 AUTONOMOUS SCANNER & KEEP-ALIVE CLIENT CONTROLLER
// ============================================================================

function formatTimeAgo(isoString) {
  if (!isoString) return 'Pending first run';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hr ago';
  return `${diffHours} hrs ago`;
}

function formatNextRun(isoString) {
  if (!isoString) return 'In ~60 mins';
  const diffMs = new Date(isoString).getTime() - Date.now();
  const diffMins = Math.ceil(diffMs / 60000);
  if (diffMins <= 0) return 'Any moment now';
  if (diffMins === 1) return 'In ~1 min';
  return `In ~${diffMins} mins`;
}

async function loadScannerStatus() {
  try {
    const res = await fetch('/api/scanner/status');
    if (!res.ok) return;
    const data = await res.json();
    const { scanner, logs } = data;

    // 1. Update Hero Pill
    const lastSyncEl = document.getElementById('scanner-last-sync');
    const statusTextEl = document.getElementById('scanner-status-text');
    const keepaliveInput = document.getElementById('input-keepalive-url');

    if (keepaliveInput) {
      keepaliveInput.value = `${window.location.origin}/api/ping`;
    }

    if (scanner.isScanning) {
      if (statusTextEl) {
        statusTextEl.textContent = 'Scanning feeds...';
        statusTextEl.className = 'text-sky-700 font-semibold animate-pulse';
      }
      if (lastSyncEl) lastSyncEl.textContent = 'In progress';
    } else if (scanner.isCoolingDown && scanner.cooldownRemainingSec > 0) {
      const mins = Math.floor(scanner.cooldownRemainingSec / 60);
      const secs = scanner.cooldownRemainingSec % 60;
      const cdStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      if (statusTextEl) {
        statusTextEl.textContent = `Shield Active (${cdStr} cooldown)`;
        statusTextEl.className = 'text-amber-700 font-semibold';
      }
      if (lastSyncEl) {
        lastSyncEl.textContent = `Data Fresh • Last run: ${formatTimeAgo(scanner.lastScanTime)}`;
      }
    } else {
      if (statusTextEl) {
        statusTextEl.textContent = 'Active (Hourly)';
        statusTextEl.className = 'text-emerald-700 font-semibold';
      }
      if (lastSyncEl) {
        lastSyncEl.textContent = `Last run: ${formatTimeAgo(scanner.lastScanTime)}`;
      }
    }

    // 2. Update Modal Diagnostics
    const modalLastRun = document.getElementById('modal-scanner-last-run');
    const modalNextRun = document.getElementById('modal-scanner-next-run');
    const modalRolesAdded = document.getElementById('modal-scanner-roles-added');
    const logsTbody = document.getElementById('scanner-logs-table-body');

    if (modalLastRun) {
      modalLastRun.textContent = scanner.lastScanTime ? formatTimeAgo(scanner.lastScanTime) : 'Starting up...';
    }
    if (modalNextRun) {
      modalNextRun.textContent = formatNextRun(scanner.nextScanTime);
    }
    if (modalRolesAdded) {
      modalRolesAdded.textContent = `${scanner.totalRolesAdded} roles added (${scanner.totalScans} runs)`;
    }

    // 3. Render Scan Logs Table
    if (logsTbody && logs) {
      if (logs.length === 0) {
        logsTbody.innerHTML = `
          <tr>
            <td colspan="5" class="py-6 text-center text-slate-400">
              <i class="fa-solid fa-spinner fa-spin mr-2"></i> Initializing first hourly scan daemon...
            </td>
          </tr>
        `;
      } else {
        logsTbody.innerHTML = logs.map(log => {
          const scanDate = new Date(log.scan_time);
          const timeFormatted = scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateFormatted = scanDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const isSuccess = log.status === 'SUCCESS';

          return `
            <tr class="hover:bg-surface-800/50 transition">
              <td class="py-2.5 px-3 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                ${dateFormatted} ${timeFormatted}
              </td>
              <td class="py-2.5 px-3 text-slate-200">
                <span class="truncate block max-w-xs text-xs" title="${log.source}">${log.source}</span>
              </td>
              <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                ${log.roles_found}
              </td>
              <td class="py-2.5 px-3 text-center font-mono font-bold ${log.roles_added > 0 ? 'text-emerald-400' : 'text-slate-400'}">
                +${log.roles_added}
              </td>
              <td class="py-2.5 px-3">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isSuccess ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950 text-rose-300 border border-rose-700/60'}">
                  ${isSuccess ? '<i class="fa-solid fa-check text-[9px]"></i> SUCCESS' : '<i class="fa-solid fa-triangle-exclamation text-[9px]"></i> FAILED'}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.warn('Scanner status check:', err);
  }
}

async function triggerManualScan() {
  const btn = document.getElementById('btn-manual-scan');
  const icon = document.getElementById('scan-btn-icon');
  const label = document.getElementById('scan-btn-label');

  if (icon) icon.className = 'fa-solid fa-arrows-rotate fa-spin text-brand-600';
  if (label) label.textContent = 'Scanning...';
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/scanner/trigger', { method: 'POST' });
    const data = await res.json();

    if (data.status === 'success') {
      alert(`✅ Hourly Scanner Complete!\n\n${data.roles_found} roles evaluated across Remotive, Jobicy & Kenyan tech feeds.\n${data.roles_added} new verified roles added to DEV CORE KE.\nNext automated scan scheduled for: ${new Date(data.next_scan_time).toLocaleTimeString()}`);
      loadJobs();
      loadScannerStatus();
    } else if (data.status === 'cached') {
      const waitMins = Math.floor(data.cooldown_remaining_sec / 60);
      const waitSecs = data.cooldown_remaining_sec % 60;
      const waitStr = waitMins > 0 ? `${waitMins}m ${waitSecs}s` : `${waitSecs}s`;
      alert(`🛡️ Fresh Listings Shield Active (10-Min Limit)\n\nJob listings are fresh and fully synchronized.\nTo prevent upstream rate limits and guard against DoS attacks, scanning is throttled to once every 10 minutes.\n\nNext scan available in: ${waitStr}`);
      loadScannerStatus();
    } else if (data.status === 'already_running') {
      alert(`⏳ Scanner In Progress\n\n${data.message || 'A role discovery scan is currently active in the background. Please wait for it to finish.'}`);
      loadScannerStatus();
    } else {
      alert(data.message || 'Scan was already running or encountered a minor issue.');
    }
  } catch (err) {
    alert('Failed to trigger scan: ' + err.message);
  } finally {
    if (icon) icon.className = 'fa-solid fa-arrows-rotate text-brand-600';
    if (label) label.textContent = 'Scan Now';
    if (btn) btn.disabled = false;
  }
}

function copyKeepAliveUrl() {
  const input = document.getElementById('input-keepalive-url');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      alert(`Copied Keep-Alive URL to clipboard:\n${input.value}\n\nAdd this to UptimeRobot or Cron-job.org with a 5 or 10-minute interval to keep Render active 24/7!`);
    }).catch(() => {
      prompt('Copy this Keep-Alive URL:', input.value);
    });
  }
}

// ==========================================
// ANONYMOUS CLIENT VISIT TELEMETRY
// ==========================================

// Automatically send privacy-safe visit telemetry on page load
function recordPageVisit() {
  try {
    const payload = {
      path: window.location.pathname + window.location.hash,
      referrer: document.referrer || 'Direct / Bookmark',
      screen: `${window.innerWidth}x${window.innerHeight}`,
      title: document.title || 'DEV CORE KE'
    };
    fetch('/api/telemetry/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {
    // Non-blocking silent catch
  }
}
