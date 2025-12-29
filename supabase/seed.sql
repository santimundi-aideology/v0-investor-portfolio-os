-- Seed data for Investor Portfolio OS
-- Generated from `lib/mock-data.ts` + `lib/mock-session.ts`

begin;

-- Clear existing rows (keep schema)
truncate table
  public.activities,
  public.deal_timeline_events,
  public.deal_checklist_items,
  public.deal_parties,
  public.deal_rooms,
  public.tasks,
  public.memos,
  public.shortlist_items,
  public.properties,
  public.investors,
  public.app_users,
  public.notifications,
  public.orgs
restart identity;

-- Orgs (from lib/mock-session.ts)
insert into public.orgs (id, name, avatar_text, plan) values
  ('org-1','Palm & Partners Realty','PP','pro'),
  ('org-2','Marina Capital Advisors','MC','enterprise');

-- Notifications (from lib/mock-session.ts)
insert into public.notifications (id, title, body, created_at_text, unread) values
  ('n-1','Task due today','Schedule site visit for Marina Tower Office Suite','Today • 10:12',true),
  ('n-2','IC memo approved','Marina Tower Office Suite memo was approved','Yesterday • 18:40',false),
  ('n-3','Deal room updated','JVC Villa moved to due diligence phase','2 days ago • 09:05',false);

-- App user (from lib/mock-data.ts currentUser)
insert into public.app_users (id, name, email, role, avatar) values
  ('user-1','Sarah Al-Rashid','sarah@investorsos.ae','realtor','/professional-woman-avatar.png');

-- Investors
insert into public.investors
  (id, name, company, email, phone, status, mandate, created_at, last_contact, total_deals, avatar)
values
  (
    'inv-1','Mohammed Al-Fayed','Al-Fayed Investments','m.alfayed@investments.ae','+971 50 123 4567','active',
    '{
      "strategy":"Core Plus",
      "investmentHorizon":"5-7 years",
      "yieldTarget":"8-12%",
      "riskTolerance":"medium",
      "preferredAreas":["Downtown Dubai","Dubai Marina","Business Bay"],
      "propertyTypes":["commercial","mixed-use"],
      "minInvestment":5000000,
      "maxInvestment":25000000,
      "notes":"Prefers Grade A office spaces with established tenants"
    }'::jsonb,
    '2024-01-15','2024-12-20',3,null
  ),
  (
    'inv-2','Fatima Hassan','Hassan Family Office','fatima@hassanfo.com','+971 55 987 6543','active',
    '{
      "strategy":"Value Add",
      "investmentHorizon":"3-5 years",
      "yieldTarget":"15-20%",
      "riskTolerance":"high",
      "preferredAreas":["JVC","Dubai South","Al Quoz"],
      "propertyTypes":["residential","land"],
      "minInvestment":2000000,
      "maxInvestment":10000000
    }'::jsonb,
    '2024-02-20','2024-12-18',1,null
  ),
  (
    'inv-3','Ahmed Khalil','Khalil Capital','ahmed@khalilcapital.ae','+971 52 555 1234','pending',
    '{
      "strategy":"Core",
      "investmentHorizon":"7-10 years",
      "yieldTarget":"6-8%",
      "riskTolerance":"low",
      "preferredAreas":["Palm Jumeirah","Emirates Hills"],
      "propertyTypes":["residential"],
      "minInvestment":10000000,
      "maxInvestment":50000000
    }'::jsonb,
    '2024-11-01','2024-12-15',0,null
  ),
  (
    'inv-4','Layla Mansour','Mansour Holdings','layla@mansourholdings.ae','+971 54 777 8899','active',
    '{
      "strategy":"Opportunistic",
      "investmentHorizon":"2-3 years",
      "yieldTarget":"20%+",
      "riskTolerance":"high",
      "preferredAreas":["Dubai Creek Harbour","MBR City"],
      "propertyTypes":["land","mixed-use"],
      "minInvestment":15000000,
      "maxInvestment":100000000
    }'::jsonb,
    '2024-03-10','2024-12-22',2,null
  );

-- Properties
insert into public.properties
  (id, title, address, area, type, status, price, size, bedrooms, bathrooms, year_built, roi, trust_score, image_url, description, features, risks, created_at)
values
  (
    'prop-1','Marina Tower Office Suite','Marina Tower, Floor 25, Dubai Marina','Dubai Marina','commercial','available',
    8500000,2500,null,null,null,9.5,87,null,
    'Premium Grade A office space with panoramic marina views.',
    array['Sea view','Fitted','Parking included','Metro access'],
    array['High service charges','Oversupply in area'],
    '2024-10-15'
  ),
  (
    'prop-2','Downtown Boulevard Retail','Boulevard Plaza, Downtown Dubai','Downtown Dubai','commercial','available',
    12000000,3200,null,null,null,11.2,92,null,
    'Prime retail space on the iconic Downtown Boulevard.',
    array['High footfall','Corner unit','Double height ceiling'],
    array['Retail market volatility'],
    '2024-09-20'
  ),
  (
    'prop-3','JVC Villa Compound','District 12, Jumeirah Village Circle','JVC','residential','available',
    4500000,4800,4,5,2022,7.8,78,null,
    'Modern villa with private pool and garden.',
    array['Private pool','Maid''s room','Smart home','Landscaped garden'],
    array['Distance from metro','Community still developing'],
    '2024-11-05'
  ),
  (
    'prop-4','Business Bay Mixed-Use Tower','Executive Towers, Business Bay','Business Bay','mixed-use','under-offer',
    45000000,15000,null,null,null,10.5,85,null,
    'Full floor mixed-use development opportunity.',
    array['Full floor','Canal view','Multiple entry points'],
    array['Large capital requirement','Management complexity'],
    '2024-08-12'
  ),
  (
    'prop-5','Dubai South Land Plot','Residential District, Dubai South','Dubai South','land','available',
    18000000,50000,null,null,null,null,72,null,
    'Strategic land plot near Expo City and Al Maktoum Airport.',
    array['Near Expo','Airport proximity','Development potential'],
    array['Long-term play','Infrastructure timing'],
    '2024-07-01'
  );

-- Shortlist
insert into public.shortlist_items (id, investor_id, property_id, score, status, notes, added_at) values
  ('sl-1','inv-1','prop-1',92,'interested','Client very interested, scheduling site visit','2024-12-10'),
  ('sl-2','inv-1','prop-2',88,'presented',null,'2024-12-15'),
  ('sl-3','inv-2','prop-3',85,'under-offer','Offer submitted, awaiting response','2024-12-01'),
  ('sl-4','inv-4','prop-5',79,'pending',null,'2024-12-20');

-- Memos
insert into public.memos (id, title, investor_id, property_id, status, content, created_at, updated_at) values
  (
    'memo-1',
    'Investment Committee Memo - Marina Tower Office Suite',
    'inv-1',
    'prop-1',
    'approved',
    '# Investment Committee Memo

## Executive Summary
This memo presents Marina Tower Office Suite for consideration by Al-Fayed Investments.

## Property Overview
- **Location:** Dubai Marina, Premium waterfront location
- **Asset Type:** Grade A Commercial Office
- **Size:** 2,500 sq ft
- **Asking Price:** AED 8,500,000

## Investment Thesis
The property aligns with the investor''s Core Plus strategy, offering stable income with upside potential through asset enhancement.

## Financial Analysis
- Current NOI: AED 765,000
- Cap Rate: 9.0%
- Target IRR: 12.5%
- Hold Period: 5 years

## Risks & Mitigations
1. High service charges - Negotiate with building management
2. Market oversupply - Focus on premium tenant retention

## Recommendation
**PROCEED** - Subject to site inspection and final due diligence.',
    '2024-12-15',
    '2024-12-18'
  ),
  (
    'memo-2',
    'Investment Committee Memo - JVC Villa Compound',
    'inv-2',
    'prop-3',
    'review',
    '# Investment Committee Memo

## Executive Summary
This memo presents JVC Villa Compound for Hassan Family Office consideration.

## Property Overview
- **Location:** JVC District 12
- **Asset Type:** Residential Villa
- **Size:** 4,800 sq ft (4BR + Maid)
- **Asking Price:** AED 4,500,000

## Investment Thesis
Value-add opportunity through interior upgrades and smart home integration to capture premium rental market.

## Financial Analysis
- Projected NOI: AED 351,000
- Target Cap Rate: 7.8%
- Renovation Budget: AED 300,000
- Target IRR: 18%

## Recommendation
**PROCEED WITH CAUTION** - Requires detailed renovation scope.',
    '2024-12-20',
    '2024-12-20'
  );

-- Tasks
insert into public.tasks
  (id, title, description, status, priority, due_date, assignee_id, assignee_name, investor_id, investor_name, property_id, property_title, created_at)
values
  (
    'task-1',
    'Schedule site visit for Marina Tower',
    'Coordinate with building management for viewing',
    'open',
    'high',
    '2024-12-28',
    null,
    'Sarah Al-Rashid',
    'inv-1',
    'Mohammed Al-Fayed',
    'prop-1',
    'Marina Tower Office Suite',
    '2024-12-20'
  ),
  (
    'task-2',
    'Update mandate for Khalil Capital',
    'Capture updated investment criteria from recent call',
    'in-progress',
    'medium',
    '2024-12-26',
    null,
    null,
    'inv-3',
    'Ahmed Khalil',
    null,
    null,
    '2024-12-18'
  ),
  (
    'task-3',
    'Prepare IC memo for Dubai South land',
    null,
    'open',
    'medium',
    '2024-12-30',
    null,
    null,
    'inv-4',
    'Layla Mansour',
    'prop-5',
    'Dubai South Land Plot',
    '2024-12-21'
  ),
  (
    'task-4',
    'Follow up on JVC offer',
    'Check status with seller''s agent',
    'open',
    'high',
    '2024-12-24',
    null,
    null,
    'inv-2',
    'Fatima Hassan',
    'prop-3',
    'JVC Villa Compound',
    '2024-12-19'
  ),
  (
    'task-5',
    'Quarterly portfolio review call',
    'Review all active deals and pipeline',
    'done',
    'low',
    null,
    null,
    null,
    'inv-1',
    'Mohammed Al-Fayed',
    null,
    null,
    '2024-12-10'
  );

-- Deal rooms
insert into public.deal_rooms (id, title, investor_id, investor_name, property_id, property_title, status, created_at) values
  ('deal-1','JVC Villa Acquisition','inv-2','Fatima Hassan','prop-3','JVC Villa Compound','due-diligence','2024-12-15');

insert into public.deal_parties (id, deal_room_id, name, role, email, phone) values
  ('p1','deal-1','Fatima Hassan','Buyer','fatima@hassanfo.com','+971 55 987 6543'),
  ('p2','deal-1','Ahmad Seller','Seller','ahmad@seller.ae',null),
  ('p3','deal-1','Law & Partners','Legal Counsel','deals@lawpartners.ae',null),
  ('p4','deal-1','Sarah Al-Rashid','Agent','sarah@investorsos.ae',null);

insert into public.deal_checklist_items (id, deal_room_id, title, category, completed, due_date) values
  ('c1','deal-1','Title Deed Verification','Legal',true,null),
  ('c2','deal-1','NOC from Developer','Legal',true,null),
  ('c3','deal-1','Technical Inspection','Technical',false,'2024-12-28'),
  ('c4','deal-1','Valuation Report','Financial',false,'2024-12-30'),
  ('c5','deal-1','MOU Signing','Legal',false,null),
  ('c6','deal-1','Deposit Transfer','Financial',false,null);

insert into public.deal_timeline_events (id, deal_room_id, title, description, date, type) values
  ('t1','deal-1','Offer Submitted',null,'2024-12-15','milestone'),
  ('t2','deal-1','Offer Accepted',null,'2024-12-18','milestone'),
  ('t3','deal-1','Title Deed Verified',null,'2024-12-20','document'),
  ('t4','deal-1','Technical Inspection','Scheduled','2024-12-28','meeting');

-- Activities
insert into public.activities (id, type, title, description, timestamp, user_id, investor_id, property_id) values
  ('act-1','memo_created','IC Memo Created','Investment memo created for Marina Tower Office Suite','2024-12-22T10:30:00Z',null,'inv-1','prop-1'),
  ('act-2','deal_updated','Deal Status Updated','JVC Villa moved to due diligence phase','2024-12-21T15:45:00Z',null,'inv-2','prop-3'),
  ('act-3','investor_added','New Investor Onboarded','Ahmed Khalil from Khalil Capital added to database','2024-12-20T09:00:00Z',null,'inv-3',null),
  ('act-4','task_completed','Task Completed','Quarterly portfolio review call with Mohammed Al-Fayed','2024-12-19T16:00:00Z',null,'inv-1',null),
  ('act-5','property_listed','Property Added','Dubai South Land Plot added to inventory','2024-12-18T11:20:00Z',null,null,'prop-5');

commit;


