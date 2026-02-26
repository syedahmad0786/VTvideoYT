#!/usr/bin/env python3
"""
Fix empty outreach message bodies in Google Sheets.

All outreach entries from the 2026-02-22 session have empty message bodies
due to a field name mismatch (sent "message_body" but Apps Script expected "body").

This script uses the new update_outreach endpoint to fill in all message bodies.

Prerequisites:
1. Deploy the updated google-sheets-webhook.gs to Apps Script
2. The update_outreach function must be available in the deployed version

Usage:
    python3 scripts/fix-outreach-bodies.py
    python3 scripts/fix-outreach-bodies.py --dry-run
"""

import json
import subprocess
import sys
import time
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.dirname(SCRIPT_DIR)
SHEETS_SYNC = os.path.join(SCRIPT_DIR, "sheets-sync.sh")

DRY_RUN = "--dry-run" in sys.argv

# ============================================================
# ALL OUTREACH MESSAGES
# Organized by company > contact > channel
# ============================================================

OUTREACH_MESSAGES = [
    # ---- Samsung Gulf Electronics / Mina Mazin ----
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Mina Mazin",
        "channel": "Email",
        "subject": "Samsung MENAT social and creator content",
        "body": """Hi Mina,

I noticed Samsung Gulf's ME Faces campaign and the creator-led content strategy you're building across the region. It's a strong direction, especially as Samsung competes on lifestyle, not just specs.

We work with global brands in the UAE on culture-led social content and creator activations. Given Samsung's push into experiential and always-on social across MENAT, I think there's a natural fit with what we do at hrmny.

We've helped brands in similar positions build regional content engines that keep pace with product cycles and cultural moments.

Would you be open to a 20-minute call this week to explore how we could support Samsung's social and creator content in the region?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Mina Mazin",
        "channel": "LinkedIn Connection",
        "body": "Hi Mina, noticed Samsung Gulf's ME Faces campaign and the creator content push across MENAT. We specialise in culture-led social content for global brands in the UAE. Would be great to connect."
    },
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Mina Mazin",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Mina.

I reached out because Samsung's creator-led content strategy across MENAT caught my attention. We work with global brands in the UAE on culture-speed social content and activations, and I think there's a strong fit with what Samsung is building regionally.

Would you be open to a quick 15-minute call this week? Happy to share a few ideas.

Best,
Ayham"""
    },

    # ---- Samsung Gulf Electronics / Shafi Alam ----
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Shafi Alam",
        "channel": "Email",
        "subject": "Samsung Gulf's D2C and brand experience",
        "body": """Hi Shafi,

Samsung Gulf's direct-to-consumer push and the way the brand is building experiential touchpoints across the region is impressive. The shift from retail-led to brand-led engagement is exactly where the market is heading.

At hrmny, we work with global brands in the UAE on culture-led creative, from social content engines to experiential activations. Given your remit across D2C, corporate marketing, and CX, I believe there's a strong overlap with what we deliver.

We've helped brands at similar scale build content and activation programs that connect product cycles to cultural relevance in the Gulf.

Would a 20-minute call make sense this week to discuss how we could support Samsung Gulf's brand experience strategy?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Shafi Alam",
        "channel": "LinkedIn Connection",
        "body": "Hi Shafi, Samsung Gulf's D2C and experiential strategy across the region is compelling. We work with global brands on culture-led creative in the UAE. Would be great to connect."
    },
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Shafi Alam",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Shafi.

I reached out because Samsung Gulf's direct-to-consumer and brand experience strategy stood out. We work with global brands in the UAE on social content, activations, and experiential creative, and I see a strong fit with your remit across D2C and corporate marketing.

Would you be open to a quick 15-minute call? Happy to share some relevant examples.

Best,
Ayham"""
    },

    # ---- Samsung Gulf Electronics / Mohammed Azzawe ----
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Mohammed Azzawe",
        "channel": "Email",
        "subject": "Samsung MENA regional marketing and insights",
        "body": """Hi Mohammed,

Samsung's approach to regional marketing across MENA, particularly the balance between global brand standards and local cultural relevance, is something few brands get right. Your consumer insights work is clearly driving sharper positioning in the Gulf.

We work with global brands in the UAE on culture-led creative and content that connects brand strategy to regional audiences. Given your focus on MENA marketing strategy and consumer insights, I think there's a natural conversation to have.

We've helped brands translate global positioning into Gulf-relevant campaigns and social content that resonates locally.

Would you be open to a 20-minute call to discuss how hrmny could support Samsung's regional marketing efforts?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Mohammed Azzawe",
        "channel": "LinkedIn Connection",
        "body": "Hi Mohammed, Samsung's regional marketing strategy across MENA is impressive. We specialise in culture-led creative for global brands in the Gulf. Would be great to connect."
    },
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Mohammed Azzawe",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Mohammed.

I reached out because Samsung's MENA marketing strategy and the way you're balancing global brand with local relevance is something we specialise in. We work with global brands on culture-led creative in the UAE, from social content to campaign production.

Would a quick 15-minute call work this week? Happy to share some relevant thinking.

Best,
Ayham"""
    },

    # ---- Samsung Gulf Electronics / Ali Ahmed (Email only) ----
    {
        "company": "Samsung Gulf Electronics",
        "contact_name": "Ali Ahmed",
        "channel": "Email",
        "subject": "Samsung MX marketing in the Gulf",
        "body": """Hi Ali,

Samsung's mobile experience division is where some of the most exciting brand storytelling happens globally, and the Galaxy launches in the Gulf have been getting bigger each cycle. The intersection of product marketing and cultural relevance is exactly where we operate.

At hrmny, we work with global brands in the UAE on social content, creator campaigns, and activations. Given your leadership of MX marketing in the region, I think there's a natural fit, particularly around launch campaigns and always-on social.

Would you be open to a 20-minute call to explore how we could support Samsung MX's creative and content in the Gulf?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },

    # ---- Seddiqi Holding / Anne Fenn ----
    {
        "company": "Seddiqi Holding",
        "contact_name": "Anne Fenn",
        "channel": "Email",
        "subject": "Seddiqi's brand storytelling opportunity",
        "body": """Hi Anne,

Seddiqi Holding's portfolio of luxury watch brands and the upcoming Dubai Watch Week create an incredible canvas for storytelling. The challenge with luxury is maintaining brand elevation while building genuine audience engagement on social, and that balance is exactly what we focus on.

At hrmny, we work with premium brands in the UAE on social content, campaign creative, and activations. I noticed iProspect handles digital media and Houbara has PR, but the SMM and cultural content space looks like an opportunity.

We've helped brands in this segment build social presences that match the quality of their product experience.

Would you be open to a quick call this week to discuss how hrmny could support Seddiqi's brand and content strategy?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Seddiqi Holding",
        "contact_name": "Anne Fenn",
        "channel": "LinkedIn Connection",
        "body": "Hi Anne, Seddiqi's luxury brand portfolio and Dubai Watch Week are fascinating from a content perspective. We work with premium brands in the UAE on culture-led creative. Would be great to connect."
    },
    {
        "company": "Seddiqi Holding",
        "contact_name": "Anne Fenn",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Anne.

I reached out because Seddiqi's portfolio of luxury brands and Dubai Watch Week present a real content opportunity. We work with premium brands in the UAE on social content and activations, and I see a gap that hrmny could fill alongside your existing agency setup.

Would you be open to a 15-minute call this week? Happy to share some thinking.

Best,
Ayham"""
    },

    # ---- Seddiqi Holding / Ahmed Samy ----
    {
        "company": "Seddiqi Holding",
        "contact_name": "Ahmed Samy",
        "channel": "Email",
        "subject": "Seddiqi's digital content and martech",
        "body": """Hi Ahmed,

Seddiqi Holding's digital transformation, particularly how luxury retail is adapting its martech stack and content systems for the region, is an area I find really compelling. The challenge of building digital engagement for heritage luxury brands without diluting exclusivity is nuanced, and it's work we know well.

At hrmny, we help premium brands in the UAE build social content systems and digital creative that match their brand standard. Given your focus on digital and marketing technology, I think there's a relevant conversation around content at scale for Seddiqi's brand portfolio.

Would you be open to a 20-minute call to explore how we could complement your digital stack with culture-led creative?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Seddiqi Holding",
        "contact_name": "Ahmed Samy",
        "channel": "LinkedIn Connection",
        "body": "Hi Ahmed, Seddiqi's digital and martech evolution for luxury retail is compelling. We help premium brands in the UAE build culture-led social content at scale. Would be great to connect."
    },
    {
        "company": "Seddiqi Holding",
        "contact_name": "Ahmed Samy",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Ahmed.

I reached out because Seddiqi's digital transformation and the challenge of building luxury content systems at scale is something we specialise in. We work with premium brands in the UAE on social content and creative production.

Would a quick 15-minute call work? I'd love to share how we've approached this for similar brands.

Best,
Ayham"""
    },

    # ---- Ethara / Andrew Stass ----
    {
        "company": "Ethara",
        "contact_name": "Andrew Stass",
        "channel": "Email",
        "subject": "Ethara's event brands and creative",
        "body": """Hi Andrew,

Ethara's portfolio of world-class events, from the Abu Dhabi GP to the NBA and UFC, creates some of the most exciting creative opportunities in the region. The challenge is turning these cultural moments into sustained brand engagement beyond race week or event day.

At hrmny, we work with brands in the UAE on culture-led creative, social content, and activations. I know The Romans handle PR, but the social content and experiential activation space around these events feels like an untapped opportunity.

We've helped brands turn tentpole moments into year-round content programs that build real audience connection.

Would you be open to a 20-minute call to discuss how hrmny could support Ethara's creative and content ambitions?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Ethara",
        "contact_name": "Andrew Stass",
        "channel": "LinkedIn Connection",
        "body": "Hi Andrew, Ethara's portfolio of cultural events across the region is impressive. We work with brands on culture-led creative and activations in the UAE. Would be great to connect."
    },
    {
        "company": "Ethara",
        "contact_name": "Andrew Stass",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Andrew.

I reached out because Ethara's events portfolio, from the Abu Dhabi GP to NBA and UFC, creates incredible creative opportunities. We specialise in turning cultural moments into sustained brand content and activations for brands in the UAE.

Would you be open to a 15-minute call? I'd love to share some ideas.

Best,
Ayham"""
    },

    # ---- Ethara / Mike Golding ----
    {
        "company": "Ethara",
        "contact_name": "Mike Golding",
        "channel": "Email",
        "subject": "Ethara's marketing and cultural moments",
        "body": """Hi Mike,

Leading marketing and communications across Ethara's event portfolio, including the F1 Abu Dhabi GP, NBA, UFC, and Etihad Arena, is arguably one of the most exciting remits in the region. These are cultural moments that demand creative at the speed of culture.

At hrmny, that's exactly what we do. We work with brands in the UAE on social content, campaign creative, and experiential activations that connect to what audiences actually care about.

Given your background at M&C Saatchi Sport and the scale of Ethara's events, I think there's a strong conversation around how we could support the creative and content ambitions around these properties.

Would a 20-minute call work this week?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Ethara",
        "contact_name": "Mike Golding",
        "channel": "LinkedIn Connection",
        "body": "Hi Mike, Ethara's event portfolio creates some of the biggest cultural moments in the region. We specialise in culture-speed creative and activations in the UAE. Would be great to connect."
    },
    {
        "company": "Ethara",
        "contact_name": "Mike Golding",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Mike.

I reached out because Ethara's events, from F1 to NBA and UFC, are exactly the kind of cultural moments we build creative around. We work with brands in the UAE on social content, campaign creative, and activations.

Would a quick 15-minute call work this week? I'd love to share some relevant examples.

Best,
Ayham"""
    },

    # ---- Al-Futtaim IKEA / Carla Klumpenaar ----
    {
        "company": "Al-Futtaim IKEA",
        "contact_name": "Carla Klumpenaar",
        "channel": "Email",
        "subject": "IKEA's social content in the UAE",
        "body": """Hi Carla,

Congratulations on the GM Marketing appointment across IKEA's four-market portfolio. Managing brand consistency at IKEA's scale while making content feel locally relevant in each market is a real challenge, and one I find fascinating.

At hrmny, we help global brands in the UAE build social content engines that keep the brand energy consistent while connecting with local audiences. I noticed Memac Ogilvy handles PR and influence, but the always-on social content space feels like an opportunity, particularly for the UAE market.

We've helped brands in retail and consumer experience build content production systems that match global brand standards while moving at the speed social demands.

Would you be open to a 20-minute call to discuss how we could support IKEA's content strategy in the region?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Al-Futtaim IKEA",
        "contact_name": "Carla Klumpenaar",
        "channel": "LinkedIn Connection",
        "body": "Hi Carla, congrats on the GM Marketing role at IKEA across four markets. We help global brands in the UAE build social content that matches their brand energy. Would be great to connect."
    },
    {
        "company": "Al-Futtaim IKEA",
        "contact_name": "Carla Klumpenaar",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Carla.

I reached out because IKEA's social content opportunity in the UAE is significant. We help global brands build always-on content engines that balance brand consistency with local relevance, and I think there's a gap alongside your existing agency setup.

Would you be open to a 15-minute call? Happy to share how we've approached this for similar brands.

Best,
Ayham"""
    },

    # ---- Lucid Motors UAE / Lara Bahous ----
    {
        "company": "Lucid Motors UAE",
        "contact_name": "Lara Bahous",
        "channel": "Email",
        "subject": "Lucid Motors ME brand building",
        "body": """Hi Lara,

Lucid's Middle East presence is at a pivotal moment. The City Walk showroom is live, the Gravity SUV launch is on the horizon, and the brand is building its regional identity from the ground up. That's an exciting position, and one where the creative and PR strategy really matters.

At hrmny, we work with automotive and lifestyle brands in the UAE on social content, PR, and campaign creative. We understand the regional media landscape and how to build brand narratives that resonate with Gulf audiences.

Given your PR and communications background and the scale of what Lucid is building in the region, I think there's a strong fit.

Would you be open to a 20-minute call to discuss how we could support Lucid's brand building in the Middle East?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Lucid Motors UAE",
        "contact_name": "Lara Bahous",
        "channel": "LinkedIn Connection",
        "body": "Hi Lara, Lucid's regional brand building is at a pivotal moment with City Walk live and Gravity launching. We work with automotive brands on creative and PR in the UAE. Would love to connect."
    },
    {
        "company": "Lucid Motors UAE",
        "contact_name": "Lara Bahous",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Lara.

I reached out because Lucid's Middle East brand building is at such an exciting stage. We work with automotive and lifestyle brands in the UAE on PR, social content, and campaign creative, and I see a strong opportunity to support Lucid's regional strategy.

Would a quick 15-minute call work this week? Happy to share some relevant thinking.

Best,
Ayham"""
    },

    # ---- BYD UAE / Anna-Maryam Faisal (LinkedIn only) ----
    {
        "company": "BYD UAE",
        "contact_name": "Anna-Maryam Faisal",
        "channel": "LinkedIn Connection",
        "body": "Hi Anna-Maryam, BYD's brand evolution in the UAE is compelling, especially the UEFA Euro work. We specialise in culture-led creative for automotive brands in the Gulf. Would love to connect."
    },
    {
        "company": "BYD UAE",
        "contact_name": "Anna-Maryam Faisal",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Anna-Maryam.

I reached out because BYD's brand repositioning in the UAE, from strong product to premium lifestyle positioning, is exactly what we specialise in. We work with brands on culture-led creative, social content, and PR across the Gulf.

Would you be open to a 15-minute call? I'd love to share some ideas on how we could support BYD's brand building.

Best,
Ayham"""
    },

    # ---- BYD UAE / Ali Tamimi (LinkedIn only) ----
    {
        "company": "BYD UAE",
        "contact_name": "Ali Tamimi",
        "channel": "LinkedIn Connection",
        "body": "Hi Ali, the marcomms strategy across AFEMC's portfolio is ambitious. We specialise in creative and content for automotive brands in the UAE. Would be great to connect."
    },
    {
        "company": "BYD UAE",
        "contact_name": "Ali Tamimi",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Ali.

I reached out because the marketing challenge across AFEMC's brand portfolio, from Polestar to BYD, is fascinating. We work with automotive and lifestyle brands in the UAE on culture-led creative and social content.

Would a quick 15-minute call make sense? Happy to share some relevant examples from similar brand-building work.

Best,
Ayham"""
    },

    # ---- Krispy Kreme MENA / Sandeep Anand ----
    {
        "company": "Krispy Kreme MENA",
        "contact_name": "Sandeep Anand",
        "channel": "Email",
        "subject": "Americana's social content at scale",
        "body": """Hi Sandeep,

Managing marketing and e-commerce across Americana's QSR portfolio in the region is a formidable remit. The challenge of producing social content at scale across multiple brands and markets while maintaining quality is something few teams get right.

At hrmny, we help F&B and consumer brands in the UAE build social content production systems that move at the speed these platforms demand. Given Krispy Kreme's 340+ locations and Americana's broader portfolio, I think there's a compelling conversation around content at scale.

Your background at Dominos India and Zomato tells me you understand the importance of digital-first brand building. We share that mindset.

Would you be open to a 20-minute call to discuss how we could support Americana's social and content strategy in the region?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Krispy Kreme MENA",
        "contact_name": "Sandeep Anand",
        "channel": "LinkedIn Connection",
        "body": "Hi Sandeep, the challenge of social content at scale across Americana's QSR brands is fascinating. We help F&B brands in the UAE build culture-led content engines. Would love to connect."
    },
    {
        "company": "Krispy Kreme MENA",
        "contact_name": "Sandeep Anand",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Sandeep.

I reached out because the social content challenge across Americana's QSR portfolio is exactly what we specialise in. We help F&B brands in the UAE build content systems that scale across markets while staying culturally relevant.

Would you be open to a 15-minute call this week? Happy to share how we've approached this for similar brands.

Best,
Ayham"""
    },

    # ---- Krispy Kreme MENA / Ahmed Hatem ----
    {
        "company": "Krispy Kreme MENA",
        "contact_name": "Ahmed Hatem",
        "channel": "Email",
        "subject": "Krispy Kreme MENA growth and brand",
        "body": """Hi Ahmed,

Leading Krispy Kreme across MENA with 340+ locations is serious scale, and the brand's social-first DNA makes the content opportunity even more compelling. Krispy Kreme globally does social brilliantly, but localising that energy for the Gulf market is a different challenge.

At hrmny, we help F&B and consumer brands in the UAE build social content and campaign creative that connects with regional audiences. Given Krispy Kreme's growth trajectory and your background leading KFC MENA marketing, I think you'll appreciate the kind of culture-led creative we produce.

Would you be open to a 20-minute call to discuss how we could support Krispy Kreme's brand and content strategy across MENA?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Krispy Kreme MENA",
        "contact_name": "Ahmed Hatem",
        "channel": "LinkedIn Connection",
        "body": "Hi Ahmed, Krispy Kreme's growth across MENA is impressive. Localising the brand's social-first DNA for the Gulf is a great creative challenge. We specialise in exactly this. Would love to connect."
    },
    {
        "company": "Krispy Kreme MENA",
        "contact_name": "Ahmed Hatem",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Ahmed.

I reached out because Krispy Kreme's MENA growth and the opportunity to localise its social-first brand energy for the Gulf market is exactly what we do at hrmny. We help F&B brands build culture-led social content and campaigns in the UAE.

Would a 15-minute call work this week? I'd love to share some relevant ideas.

Best,
Ayham"""
    },

    # ---- FIX Dessert Chocolatier / Sarah Hamouda (LinkedIn only) ----
    {
        "company": "FIX Dessert Chocolatier",
        "contact_name": "Sarah Hamouda",
        "channel": "LinkedIn Connection",
        "body": "Hi Sarah, FIX's brand journey from viral sensation to a genuine lifestyle brand is inspiring. We help consumer brands in the UAE scale their creative and PR strategy. Would love to connect."
    },
    {
        "company": "FIX Dessert Chocolatier",
        "contact_name": "Sarah Hamouda",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Sarah.

I reached out because FIX's evolution from viral success to a sustained premium brand is a transition we've seen many brands navigate. We specialise in helping consumer brands in the UAE build PR, social content, and brand strategy that sustains momentum beyond the initial buzz.

Would you be open to a quick call? I'd love to share some thinking on FIX's next chapter.

Best,
Ayham"""
    },

    # ---- FIX Dessert Chocolatier / Danita Rodrigues (LinkedIn only) ----
    {
        "company": "FIX Dessert Chocolatier",
        "contact_name": "Danita Rodrigues",
        "channel": "LinkedIn Connection",
        "body": "Hi Danita, FIX's social media and events are brilliant. We work with consumer brands in the UAE on creative content and activations. Would love to connect."
    },
    {
        "company": "FIX Dessert Chocolatier",
        "contact_name": "Danita Rodrigues",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Danita.

I reached out because FIX's social media presence and events are doing a lot right. We work with consumer brands in the UAE on social content strategy and creative production, and I think there's an opportunity to take FIX's content to the next level.

Would you be open to a quick chat? Happy to share some ideas.

Best,
Ayham"""
    },

    # ---- FIX Dessert Chocolatier / Yezen Alani (LinkedIn only) ----
    {
        "company": "FIX Dessert Chocolatier",
        "contact_name": "Yezen Alani",
        "channel": "LinkedIn Connection",
        "body": "Hi Yezen, FIX's growth from Dubai to a global brand has been impressive to watch. We help consumer brands scale their creative and PR. Would be great to connect."
    },
    {
        "company": "FIX Dessert Chocolatier",
        "contact_name": "Yezen Alani",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Yezen.

I reached out because FIX's journey from Dubai to a global brand is exactly the kind of growth story we love supporting. We help consumer brands in the UAE with PR, social strategy, and brand management as they scale.

Would you be open to a 15-minute call? I think there's a strong conversation to have about FIX's brand strategy.

Best,
Ayham"""
    },

    # ---- Pacsun / Noelle Sadler ----
    {
        "company": "Pacsun",
        "contact_name": "Noelle Sadler",
        "channel": "Email",
        "subject": "Pacsun's Dubai market entry",
        "body": """Hi Noelle,

Pacsun's international expansion into Dubai is a significant moment for the brand. The UAE market is uniquely positioned at the intersection of youth culture, streetwear, and premium retail, and getting the creative strategy right from day one is critical.

At hrmny, we help global brands launching in the UAE build culture-fluent creative strategies. From social content to influencer partnerships to activations, we understand how to connect Western lifestyle brands with Gulf audiences in a way that feels authentic.

This is exactly the kind of launch where having a regional creative partner from the start makes a measurable difference.

Would you be open to a 20-minute call to discuss how we could support Pacsun's UAE launch?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Pacsun",
        "contact_name": "Noelle Sadler",
        "channel": "LinkedIn Connection",
        "body": "Hi Noelle, Pacsun's Dubai market entry is exciting. We help global brands launch in the UAE with culture-fluent creative and activations. Would love to connect."
    },
    {
        "company": "Pacsun",
        "contact_name": "Noelle Sadler",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Noelle.

I reached out because Pacsun's Dubai launch is the kind of moment where having a culture-fluent creative partner in the region makes a real difference. We help global brands in the UAE build social content, influencer strategies, and activations from day one.

Would a 15-minute call work this week? I'd love to share how we approach market entry creative.

Best,
Ayham"""
    },

    # ---- Gymshark / Calum Watson ----
    {
        "company": "Gymshark",
        "contact_name": "Calum Watson",
        "channel": "Email",
        "subject": "Gymshark's ME fitness community",
        "body": """Hi Calum,

Gymshark's approach to community-building has always set the brand apart, and the Middle East fitness scene is one of the most vibrant and fast-growing globally. Dubai alone has become a hub for fitness creators, athletes, and wellness culture.

At hrmny, we help lifestyle and sports brands in the UAE build community-led creative, from social content to activations to athlete and influencer partnerships. The intersection of performance and lifestyle is exactly where we operate.

Building a ME fitness community from scratch requires creative that understands both the culture and the platforms. We'd love to be part of that conversation.

Would you be open to a 20-minute call to explore how we could support Gymshark's regional strategy?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Gymshark",
        "contact_name": "Calum Watson",
        "channel": "LinkedIn Connection",
        "body": "Hi Calum, Gymshark's community-building approach is perfect for the booming ME fitness scene. We help sports and lifestyle brands build culture-led creative in the UAE. Would love to connect."
    },
    {
        "company": "Gymshark",
        "contact_name": "Calum Watson",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Calum.

I reached out because the ME fitness community is exactly the kind of space Gymshark should own, and building it requires creative that understands the culture here. We work with sports and lifestyle brands in the UAE on social content, community activations, and athlete partnerships.

Would a 15-minute call work? I'd love to share some ideas on the ME opportunity.

Best,
Ayham"""
    },

    # ---- Ulta Beauty / Anne Tulloch ----
    {
        "company": "Ulta Beauty",
        "contact_name": "Anne Tulloch",
        "channel": "Email",
        "subject": "Ulta Beauty's UAE content and PR",
        "body": """Hi Anne,

Ulta Beauty's expansion in the UAE through Alshaya is a compelling brand play, bringing a new beauty retail concept to a market that's obsessed with beauty content. The challenge is building the right content and PR engine to match the scale of the opportunity.

At hrmny, we help beauty and consumer brands in the UAE build social content, PR strategies, and creator programs. Given your 25+ years in regional marketing and your focus on beauty and wellness at Alshaya, I think there's a strong conversation to be had.

Scaling Ulta's content and PR for the UAE market requires a creative partner who understands both the beauty consumer and the Gulf media landscape. That's exactly what we do.

Would you be open to a 20-minute call to discuss how we could support Ulta Beauty's growth in the region?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Ulta Beauty",
        "contact_name": "Anne Tulloch",
        "channel": "LinkedIn Connection",
        "body": "Hi Anne, Ulta Beauty's UAE expansion through Alshaya is exciting. We help beauty and consumer brands build content and PR strategies in the Gulf. Would love to connect."
    },
    {
        "company": "Ulta Beauty",
        "contact_name": "Anne Tulloch",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Anne.

I reached out because Ulta Beauty's UAE growth is a compelling content and PR opportunity. We work with beauty and consumer brands in the region on social content, creator programs, and PR strategy.

With your experience leading regional marketing at Alshaya, I think there's a strong fit. Would a quick 15-minute call work this week?

Best,
Ayham"""
    },

    # ---- Emaar / Maher Alrahman ----
    {
        "company": "Emaar",
        "contact_name": "Maher Alrahman",
        "channel": "Email",
        "subject": "Emaar's consumer brand content",
        "body": """Hi Maher,

Emaar's consumer-facing brands, from Dubai Mall to the entertainment and hospitality portfolio, are at the centre of Dubai's cultural landscape. With record-breaking growth and visitor numbers, the content and creative opportunity is significant.

At hrmny, we help lifestyle and consumer brands in the UAE build social content, campaign creative, and activations that move at the speed of culture. Given your role overseeing media, promotions, and the Dubai Mall Exhibition Centre, I think there's a natural fit.

We've helped brands in similar positions build content programs that match the scale and energy of their physical experiences.

Would you be open to a 20-minute call to explore how we could support Emaar's consumer brand content and activations?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Emaar",
        "contact_name": "Maher Alrahman",
        "channel": "LinkedIn Connection",
        "body": "Hi Maher, Emaar's consumer brands and cultural programming create incredible content opportunities. We help lifestyle brands in the UAE with culture-led creative and activations. Would love to connect."
    },
    {
        "company": "Emaar",
        "contact_name": "Maher Alrahman",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Maher.

I reached out because Emaar's consumer-facing brands create some of the strongest creative opportunities in the region. We work with lifestyle brands in the UAE on social content, campaign creative, and activations.

Would you be open to a 15-minute call? I'd love to share some relevant thinking around content and experiential for Emaar's consumer brands.

Best,
Ayham"""
    },

    # ---- Air Arabia / Abhishek Sharma ----
    {
        "company": "Air Arabia",
        "contact_name": "Abhishek Sharma",
        "channel": "Email",
        "subject": "Air Arabia's digital and social opportunity",
        "body": """Hi Abhishek,

Air Arabia's record year with 21.8 million passengers and the upcoming London Gatwick launch in March create a powerful brand moment. But the digital presence, particularly on social, doesn't yet match the scale of what the airline has become. That's an opportunity, not a criticism.

At hrmny, we help consumer brands in the UAE build social content strategies and TikTok presences that connect with younger audiences. Given your background at TikTok MENA, you understand the platform's potential for travel brands better than most.

The Gatwick launch alone is a campaign moment worth building social content around. We'd love to be part of that conversation.

Would you be open to a 20-minute call to discuss how we could support Air Arabia's digital and social strategy?

Best,
Ayham Homsi
Managing Partner, Creative & Growth
hrmny"""
    },
    {
        "company": "Air Arabia",
        "contact_name": "Abhishek Sharma",
        "channel": "LinkedIn Connection",
        "body": "Hi Abhishek, Air Arabia's record growth and the Gatwick launch are exciting. With your TikTok MENA background, the social opportunity is clear. We specialise in this space. Would love to connect."
    },
    {
        "company": "Air Arabia",
        "contact_name": "Abhishek Sharma",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Abhishek.

I reached out because Air Arabia's digital opportunity is significant, especially with the London Gatwick launch coming up. We help consumer brands in the UAE build social content and TikTok strategies, and with your background at TikTok MENA, I think you'll appreciate our approach.

Would a 15-minute call work this week? Happy to share some ideas.

Best,
Ayham"""
    },

    # ---- LinkedIn Follow-ups only (contacts who already have email + connection request) ----

    # ADNOC Distribution / Jacqueline Elboghdadi - LinkedIn Follow-up
    {
        "company": "ADNOC Distribution",
        "contact_name": "Jacqueline Elboghdadi",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Jacqueline.

I reached out because the Oasis by ADNOC rebrand is a fascinating consumer brand play. We work with major brands in the UAE on social content and creative production, and I see a real opportunity to build Oasis's consumer presence, especially on TikTok where the brand is underrepresented.

Would you be open to a 15-minute call? Happy to share some relevant thinking.

Best,
Ayham"""
    },

    # Air Arabia / Housam Raydan - LinkedIn Follow-up
    {
        "company": "Air Arabia",
        "contact_name": "Housam Raydan",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Housam.

I reached out because Air Arabia's record growth and the London Gatwick launch in March are major brand moments. We work with consumer brands in the UAE on social content and campaign creative, and I see a strong fit with Air Arabia's brand ambitions.

Would a 15-minute call work? I'd love to discuss how we could support the brand's content strategy.

Best,
Ayham"""
    },

    # Aramex / Daniel Nuss - LinkedIn Follow-up
    {
        "company": "Aramex",
        "contact_name": "Daniel Nuss",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Daniel.

I reached out because Aramex's brand potential is significant, from the sailing sponsorship to the consumer brand story. We help brands in the UAE build social content and creative strategies, and I think there's a strong opportunity to elevate Aramex's brand presence.

Would you be open to a quick call? Happy to share some ideas.

Best,
Ayham"""
    },

    # Atlantis Resorts / Ravini Perera - LinkedIn Follow-up
    {
        "company": "Atlantis Resorts",
        "contact_name": "Ravini Perera",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Ravini.

I reached out because Atlantis's content opportunity is immense, especially with the Forbes #2 ranking bringing global attention. We work with hospitality and lifestyle brands in the UAE on social content and experiential creative.

Would a 15-minute call make sense? I'd love to discuss how we could support Atlantis's content ambitions.

Best,
Ayham"""
    },

    # DIFC / Mahmoud Nsouli - LinkedIn Follow-up
    {
        "company": "DIFC",
        "contact_name": "Mahmoud Nsouli",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Mahmoud.

I reached out because DIFC's evolution into a lifestyle destination is undertold digitally. Gate Avenue's dining and cultural programming deserve stronger social content. We help brands in the UAE build content strategies and creative that connect with audiences.

Would you be open to a 15-minute call? I'd love to share some thinking on DIFC's content opportunity.

Best,
Ayham"""
    },

    # LEGOLAND Dubai Resort / John Thekanady - LinkedIn Follow-up
    {
        "company": "LEGOLAND Dubai Resort",
        "contact_name": "John Thekanady",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, John.

I reached out because LEGOLAND's 2026 space-themed land launch is a major campaign moment. With your background at Emirates and McDonald's, you know the value of creative that cuts through. We help entertainment and lifestyle brands in the UAE build social content and campaign creative.

Would a 15-minute call work? Happy to share some relevant ideas.

Best,
Ayham"""
    },

    # Sharaf DG / Viknesh Sadasivan - LinkedIn Follow-up
    {
        "company": "Sharaf DG",
        "contact_name": "Viknesh Sadasivan",
        "channel": "LinkedIn Follow-up",
        "body": """Thanks for connecting, Viknesh.

I reached out because Sharaf DG's Saudi expansion and omnichannel push create a real creative opportunity. We work with retail brands in the UAE on social content and campaign creative that bridges the digital-physical experience.

Would a 15-minute call make sense? I'd love to discuss how we could support Sharaf DG's content strategy.

Best,
Ayham"""
    },
]

# ============================================================
# LINKEDIN URLS - for entries missing profile URLs
# ============================================================

LINKEDIN_URLS = {
    ("Samsung Gulf Electronics", "Mina Mazin"): "https://www.linkedin.com/in/minamazin",
    ("Seddiqi Holding", "Anne Fenn"): "https://www.linkedin.com/in/anne-fenn/",
    ("Ethara", "Andrew Stass"): "https://www.linkedin.com/in/andrew-stass-3472ba42/",
    ("Al-Futtaim IKEA", "Carla Klumpenaar"): "https://www.linkedin.com/in/carla-klumpenaar-84519",
    ("Lucid Motors UAE", "Lara Bahous"): "https://www.linkedin.com/in/lara-bahous-631878b0/",
    ("BYD UAE", "Anna-Maryam Faisal"): "https://www.linkedin.com/in/anna-maryam-faisal-34a",
    ("Krispy Kreme MENA", "Sandeep Anand"): "https://www.linkedin.com/in/sandeep-anand-5749a09/",
    ("FIX Dessert Chocolatier", "Sarah Hamouda"): "http://www.linkedin.com/in/sarah-hamouda",
    ("Pacsun", "Noelle Sadler"): "https://www.linkedin.com/in/noellesadler/",
    ("Gymshark", "Calum Watson"): "http://www.linkedin.com/in/calumwatson1",
    ("Ulta Beauty", "Anne Tulloch"): "http://www.linkedin.com/in/annetulloch1",
    ("Emaar", "Maher Alrahman"): "http://www.linkedin.com/in/maher-abd-alrahman-3074",
    ("Emaar", "Hamdan Al-Abbar"): "http://www.linkedin.com/in/hamdan-al-abbar-3b75731",
    ("ADNOC Distribution", "Jacqueline Elboghdadi"): "https://linkedin.com/in/jacqueline-elboghdadi-413aab34",
    ("Air Arabia", "Housam Raydan"): "https://linkedin.com/in/housam-raydan-338a2719",
    ("Aramex", "Daniel Nuss"): "https://linkedin.com/in/businuss",
    ("Atlantis Resorts", "Ravini Perera"): "http://www.linkedin.com/in/ravini-perera-194814215",
    ("DIFC", "Mahmoud Nsouli"): "https://linkedin.com/in/mahmoud-nsouli-a409648",
    ("LEGOLAND Dubai Resort", "John Thekanady"): "http://www.linkedin.com/in/john-thekanady-digital-",
    ("Sharaf DG", "Viknesh Sadasivan"): "http://www.linkedin.com/in/viknesh",
    ("Air Arabia", "Abhishek Sharma"): "https://linkedin.com/in/abhishek-s-53018616",
}


def run_update(data):
    """Send update_outreach command via sheets-sync.sh"""
    payload = json.dumps(data, ensure_ascii=False)

    if DRY_RUN:
        print(f"  [DRY RUN] Would update: {data['company']} / {data['contact_name']} / {data['channel']}")
        body_preview = data.get('body', '')[:60]
        print(f"            Body preview: {body_preview}...")
        return True

    try:
        result = subprocess.run(
            [SHEETS_SYNC, "update_outreach", payload],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            response = json.loads(result.stdout)
            if response.get("success"):
                print(f"  OK: {data['company']} / {data['contact_name']} / {data['channel']} (row {response.get('row', '?')})")
                return True
            else:
                print(f"  FAIL: {response.get('error', 'unknown error')}")
                return False
        else:
            print(f"  ERROR: {result.stderr}")
            return False
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        return False


def main():
    print("=" * 60)
    print("Fix Outreach Message Bodies")
    print("=" * 60)

    if DRY_RUN:
        print("[DRY RUN MODE - no changes will be made]")
    print()

    # Phase 1: Update message bodies
    print(f"Phase 1: Updating {len(OUTREACH_MESSAGES)} outreach message bodies...")
    print("-" * 40)

    success_count = 0
    fail_count = 0

    for msg in OUTREACH_MESSAGES:
        update_data = {
            "company": msg["company"],
            "contact_name": msg["contact_name"],
            "channel": msg["channel"],
            "body": msg["body"].strip()
        }

        # Also include subject if present
        if "subject" in msg:
            update_data["subject"] = msg["subject"]

        # Add LinkedIn URL to recipient_email for LinkedIn channels
        if msg["channel"] in ("LinkedIn Connection", "LinkedIn Follow-up"):
            key = (msg["company"], msg["contact_name"])
            if key in LINKEDIN_URLS:
                update_data["recipient_email"] = LINKEDIN_URLS[key]

        if run_update(update_data):
            success_count += 1
        else:
            fail_count += 1

        # Small delay to avoid rate limiting
        if not DRY_RUN:
            time.sleep(0.5)

    print()
    print(f"Phase 1 complete: {success_count} succeeded, {fail_count} failed")
    print()

    # Phase 2: Add LinkedIn URLs to older entries that don't have them
    print("Phase 2: Adding LinkedIn URLs to older outreach entries...")
    print("-" * 40)

    older_linkedin_entries = [
        # Entries from rows 11-36 that have bodies but may not have LinkedIn URLs
        ("Sharaf DG", "Viknesh Sadasivan", "LinkedIn Connection"),
        ("Atlantis Resorts", "Ravini Perera", "LinkedIn Connection"),
        ("LEGOLAND Dubai Resort", "John Thekanady", "LinkedIn Connection"),
        ("Emaar", "Hamdan Al-Abbar", "LinkedIn Connection"),
        ("ADNOC Distribution", "Jacqueline Elboghdadi", "LinkedIn Connection"),
        ("Aramex", "Daniel Nuss", "LinkedIn Connection"),
        ("Air Arabia", "Housam Raydan", "LinkedIn Connection"),
        ("DIFC", "Mahmoud Nsouli", "LinkedIn Connection"),
    ]

    for company, contact, channel in older_linkedin_entries:
        key = (company, contact)
        if key in LINKEDIN_URLS:
            update_data = {
                "company": company,
                "contact_name": contact,
                "channel": channel,
                "recipient_email": LINKEDIN_URLS[key]
            }
            if run_update(update_data):
                success_count += 1
            else:
                fail_count += 1
            if not DRY_RUN:
                time.sleep(0.5)

    print()
    print("=" * 60)
    print(f"TOTAL: {success_count} succeeded, {fail_count} failed")
    print("=" * 60)

    # Phase 3: Fix Emaar contacts
    print("\nPhase 3: Fixing Emaar contact records...")
    print("-" * 40)

    # Fix Maher Alrahman (added with empty name)
    fix_maher = json.dumps({
        "company": "Emaar",
        "name": "",
        "new_name": "Maher Alrahman"
    })

    if DRY_RUN:
        print("  [DRY RUN] Would fix Maher Alrahman contact name")
    else:
        try:
            result = subprocess.run(
                [SHEETS_SYNC, "update_contact", fix_maher],
                capture_output=True, text=True, timeout=30
            )
            response = json.loads(result.stdout) if result.returncode == 0 else {}
            if response.get("success"):
                print(f"  OK: Fixed Maher Alrahman name (row {response.get('row', '?')})")
                success_count += 1
            else:
                print(f"  FAIL: {response.get('error', result.stderr)}")
                fail_count += 1
        except Exception as e:
            print(f"  EXCEPTION: {e}")
            fail_count += 1

    # Add Ilaf Suliman
    add_ilaf = json.dumps({
        "company": "Emaar",
        "name": "Ilaf Suliman",
        "title": "Marketing Manager, Malls & Destinations",
        "email": "i.suliman@emaar.ae",
        "email_status": "Verified",
        "linkedin_url": "",
        "seniority": "Manager",
        "why_this_person": "Marketing Manager for Emaar Malls & Destinations. Direct buyer for mall-level campaigns and activations. Good operational contact alongside Maher.",
        "outreach_status": "Not Contacted"
    })

    if DRY_RUN:
        print("  [DRY RUN] Would add Ilaf Suliman contact")
    else:
        try:
            result = subprocess.run(
                [SHEETS_SYNC, "add_contact", add_ilaf],
                capture_output=True, text=True, timeout=30
            )
            response = json.loads(result.stdout) if result.returncode == 0 else {}
            if response.get("success"):
                print(f"  OK: Added Ilaf Suliman (row {response.get('row', '?')})")
                success_count += 1
            else:
                print(f"  FAIL: {response.get('error', result.stderr)}")
                fail_count += 1
        except Exception as e:
            print(f"  EXCEPTION: {e}")
            fail_count += 1

    time.sleep(0.5)

    print()
    print("=" * 60)
    print(f"FINAL TOTAL: {success_count} succeeded, {fail_count} failed")
    print("=" * 60)

    if DRY_RUN:
        print("\nRe-run without --dry-run to apply changes.")

    # Reminder about duplicate rows
    print("\nNOTE: Rows 2-10 in the Outreach tab are old duplicate entries")
    print("for Pacsun, Gymshark, and Ulta Beauty (no email, no body).")
    print("Delete these manually from the Google Sheet after running this script.")


if __name__ == "__main__":
    main()
