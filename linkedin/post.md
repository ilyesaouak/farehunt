The cheapest way to Tunisia isn't always the closest airport. ✈️🇹🇳

Every time I fly home from Heidelberg, I run the same routine: open 10 tabs, check Frankfurt, Stuttgart, Basel, Paris, Milan… then try to work out in my head whether a cheap flight is still cheap once I add the train ride to get there.

Flight search engines stop at the airport. Your trip doesn't.

So I built FareHunt, a door-to-door fare hunter.

🔎 What it does
• Scans 12 airports across Germany, France, Switzerland and Italy, flying to Tunis, Enfidha, Monastir and Djerba
• Searches up to 7 flexible departure days in one go (up to 336 lookups)
• Adds the real train or bus cost and time to each airport, counted both ways on return trips
• Ranks every route by total cost, door-to-door time and risk, not just the ticket price

💡 What's different
• True total cost: you see what you'd actually pay and what time you'd have to leave home
• A score that explains itself: 60% price, 25% travel time, 15% reliability, relative to the best option found
• A risk model that flags long ground legs, many changes, cross-border trains, layovers and departures before 5 AM
• Live streaming: results appear on an animated map as each lookup comes back, instead of making you stare at a spinner
• Cost-aware design: capped concurrency, caching and a lookup budget keep API usage under control
• One click to book the flight, plus a pre-filled Deutsche Bahn search for the train

🛠 Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4 and Framer Motion, using Google Flights data via SerpAPI.

It started as a tool to save myself a few euros and a lot of tabs. It ended up teaching me a lot about streaming APIs, scoring models and designing for real-world trade-offs.

Swipe through to see it in action 👉

If you also travel between Europe and North Africa, which airports do you usually compare? I'd love to hear how you search.

(Screenshots use the app's demo mode with simulated prices.)

#WebDevelopment #NextJS #React #TypeScript #SideProject #Travel #Tunisia #BuildInPublic
