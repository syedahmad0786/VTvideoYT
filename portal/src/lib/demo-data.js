// Demo data for the dashboard — replaced by live API when sheets-config.json is set up

export const DEMO_COMPANIES = [
  { company: 'Samsung Gulf Electronics', sector: 'Consumer Tech', icp_fit: 'Hot', stage: 'Outreach Ready', services: 'SMM, Campaigns', est_value: 450000, lead_source: 'Cold Outbound', date_added: '2026-02-20' },
  { company: 'Seddiqi Holding', sector: 'Luxury Retail', icp_fit: 'Hot', stage: 'Contacts Found', services: 'SMM, Activations', est_value: 500000, lead_source: 'Cold Outbound', date_added: '2026-02-20' },
  { company: 'On Running ME', sector: 'Sports / Wellness', icp_fit: 'Hot', stage: 'Sent', services: 'SMM, PR, Campaigns', est_value: 350000, lead_source: 'Cold Outbound', date_added: '2026-02-21' },
  { company: 'Lucid Motors UAE', sector: 'Automotive / EV', icp_fit: 'Warm', stage: 'Researched', services: 'SMM, PR, Campaigns', est_value: 400000, lead_source: 'Cold Outbound', date_added: '2026-02-21' },
  { company: 'BYD UAE (Al-Futtaim)', sector: 'Automotive / EV', icp_fit: 'Cool', stage: 'Researched', services: 'Branding, SMM', est_value: 275000, lead_source: 'Cold Outbound', date_added: '2026-02-21' },
  { company: 'Hoka (Apparel Group)', sector: 'Sports / Wellness', icp_fit: 'Hot', stage: 'Contacts Found', services: 'SMM, Campaigns, Activations', est_value: 300000, lead_source: 'Cold Outbound', date_added: '2026-02-24' },
  { company: 'FIX Dessert Chocolatier', sector: 'F&B Retail', icp_fit: 'Warm', stage: 'Sent', services: 'SMM, Content', est_value: 200000, lead_source: 'Intent Signal', date_added: '2026-02-22' },
  { company: 'lululemon ME', sector: 'Sports / Wellness', icp_fit: 'Warm', stage: 'Approved', services: 'SMM, Activations', est_value: 350000, lead_source: 'Cold Outbound', date_added: '2026-02-24' },
  { company: 'Zeekr UAE', sector: 'Automotive / EV', icp_fit: 'Warm', stage: 'Sent', services: 'SMM, PR, Campaigns', est_value: 350000, lead_source: 'Cold Outbound', date_added: '2026-02-25' },
  { company: 'Al Ghurair', sector: 'Retail', icp_fit: 'Warm', stage: 'Sent', services: 'SMM, Campaigns', est_value: 300000, lead_source: 'Cold Outbound', date_added: '2026-02-23' },
  { company: 'JKS Restaurants', sector: 'F&B', icp_fit: 'Cool', stage: 'Sent', services: 'SMM, PR', est_value: 180000, lead_source: 'Cold Outbound', date_added: '2026-02-23' },
  { company: 'Xpeng UAE', sector: 'Automotive / EV', icp_fit: 'Warm', stage: 'Replied', services: 'SMM, Branding', est_value: 350000, lead_source: 'Cold Outbound', date_added: '2026-02-25' },
];

export const DEMO_OUTREACH = [
  { company: 'Samsung Gulf Electronics', contact_name: 'Shafi Alam', title: 'Head of Digital Marketing', email: 'shafi.alam@samsung.com', email_status: 'Verified', contact_stage: 'Contact Approved', email_stage: 'Sent', li_connection_stage: 'Accepted', li_follow_up_stage: 'Sent' },
  { company: 'Samsung Gulf Electronics', contact_name: 'Mohammed Azzawe', title: 'Sr. Director MENA Marketing', email: 'mohammed.azzawe@samsung.com', email_status: 'Unverified', contact_stage: 'Contact Approved', email_stage: 'Drafted', li_connection_stage: 'Sent', li_follow_up_stage: 'Drafted' },
  { company: 'On Running ME', contact_name: 'Kareem Doukhei', title: 'Marketing Manager ME', email: 'kareem@on-running.com', email_status: 'Verified', contact_stage: 'Contact Approved', email_stage: 'Sent', li_connection_stage: 'Sent', li_follow_up_stage: 'Drafted' },
  { company: 'Hoka (Apparel Group)', contact_name: 'Sarah Mitchell', title: 'Brand Director', email: 'sarah.m@apparelgroup.com', email_status: 'Verified', contact_stage: 'Contact Found', email_stage: '', li_connection_stage: '', li_follow_up_stage: '' },
  { company: 'FIX Dessert Chocolatier', contact_name: 'Darin Dabasay', title: 'CMO', email: '', email_status: 'Unavailable', contact_stage: 'Contact Approved', email_stage: '', li_connection_stage: 'Sent', li_follow_up_stage: 'Drafted' },
  { company: 'Zeekr UAE', contact_name: 'Sara O\'Hara', title: 'Head of Corporate Comms', email: 'sara@zeekr.ae', email_status: 'Verified', contact_stage: 'Contact Approved', email_stage: 'Sent', li_connection_stage: 'Accepted', li_follow_up_stage: 'Sent' },
  { company: 'Al Ghurair', contact_name: 'Sonya Jose', title: 'Marketing Director', email: 'sonya.j@alghurair.com', email_status: 'Verified', contact_stage: 'Contact Approved', email_stage: 'Sent', li_connection_stage: 'Sent', li_follow_up_stage: 'Drafted' },
  { company: 'Xpeng UAE', contact_name: 'Tarek Bedran', title: 'Marketing Manager', email: '', email_status: 'Unavailable', contact_stage: 'Contact Approved', email_stage: '', li_connection_stage: 'Sent', li_follow_up_stage: 'Drafted' },
  { company: 'Xpeng UAE', contact_name: 'Mohamed Al Dhaheri', title: 'Regional Director', email: 'mal@xpeng.ae', email_status: 'Verified', contact_stage: 'Contact Approved', email_stage: 'Replied', li_connection_stage: 'Accepted', li_follow_up_stage: 'Replied' },
];

export const DEMO_PIPELINE = [
  { name: 'Red Bull ME', stage: 'Connected', value: 500000, contact: 'Kareem Al-Masri', days_in_stage: 5, next_step: 'Schedule discovery call' },
  { name: 'Xpeng UAE', stage: 'Connected', value: 350000, contact: 'Mohamed Al Dhaheri', days_in_stage: 2, next_step: 'Send credentials deck' },
  { name: 'DIFC', stage: 'Qualified', value: 800000, contact: 'Nadia Hussain', days_in_stage: 12, next_step: 'Submit proposal' },
  { name: 'OSN+', stage: 'Qualified', value: 600000, contact: 'Ahmad Fares', days_in_stage: 8, next_step: 'Follow up on proposal revision' },
];

export const DEMO_METRICS = {
  total_pipeline: 15057140,
  active_pipeline: 3397105,
  booked_ytd: 2781516,
  target_h1: 5000000,
  win_rate: 26.7,
  target_win_rate: 40,
  companies_researched: 12,
  companies_approved: 8,
  contacts_found: 18,
  outreach_sent: 14,
  replies: 3,
  connected: 2,
  meetings_this_week: 1,
  target_meetings_week: 3,
};

export function getStageCounts(companies) {
  const counts = {};
  companies.forEach((c) => {
    counts[c.stage] = (counts[c.stage] || 0) + 1;
  });
  return counts;
}

export function getICPCounts(companies) {
  const counts = { Hot: 0, Warm: 0, Cool: 0 };
  companies.forEach((c) => {
    if (counts[c.icp_fit] !== undefined) counts[c.icp_fit]++;
  });
  return counts;
}

export function getSectorCounts(companies) {
  const counts = {};
  companies.forEach((c) => {
    const sector = c.sector?.split('/')[0]?.trim() || 'Other';
    counts[sector] = (counts[sector] || 0) + 1;
  });
  return counts;
}
