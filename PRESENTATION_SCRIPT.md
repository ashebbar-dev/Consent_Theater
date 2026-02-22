# 🎭 Consent Theater — Hackathon Presentation Script

**Total Time: ~7 minutes** (adjust pacing based on your slot — cut Act Two details if short on time)

---

## OPENING — The Hook (45 seconds)

> *[Dashboard is loaded, screen visible to judges. Phone in hand.]*

**Say:**

"Raise your hand if you've ever clicked 'I Accept' on a privacy policy without reading it."

*[Pause — let them raise hands/laugh]*

"Every single one of us just signed a contract we didn't read. And that's not an accident — it's by design."

"Today we're going to show you what you actually agreed to. Not in legal jargon. Not in some boring report. We're going to turn YOUR phone into the evidence."

"This is **Consent Theater** — a privacy awareness tool that scans your actual phone, captures your real network traffic, and presents the findings as a four-act data story. Everything you're about to see is real data from a real phone."

---

## ACT ZERO — The Reveal (1.5 minutes)

> *[Click "Act Zero" on the navigation]*

**Say:**

"Act Zero is the reveal. We scanned this phone and found **191 installed apps**. Let's see what's hiding inside them."

> *[Show the App Grid — scroll slowly]*

"Every card shows an app, its **risk score**, how many **trackers** are embedded in its code, and how many **dangerous permissions** it has. See this? Truecaller — the app you use to identify spam calls — has embedded trackers from **384 companies** and requests **11 dangerous permissions** including your contacts, call log, camera, and microphone."

> *[Scroll to TrackerTreemap]*

"This treemap shows every tracker company, sized by how many of your apps they're embedded in. The bigger the block, the more they're watching. Notice how a few companies — Google, Facebook, Amazon — dominate the entire map. They see everything."

> *[Scroll to Permission Matrix]*

"This permission matrix is the scariest part. Each row is an app. Each column is a dangerous permission — camera, microphone, contacts, location. Every filled cell means data flowing from your pocket to a company's servers. Look at how many apps have access to your GPS location. You didn't know most of these apps were tracking where you are."

> *[Scroll to Prediction Panel]*

"And based on just the apps you have installed — without any browsing history — data brokers can already infer your likely gender, age range, income level, and interests. Your installed apps alone tell them almost everything. And this data? It generates an estimated **₹X per year** in advertising revenue. That's how much your attention is worth."

---

## ACT ONE — The Broadcast (1.5 minutes)

> *[Click "Act One" — the globe should start animating]*

**Say:**

"Act Zero showed what's *in* your apps. Act One shows what your apps are *doing* — right now, in real time."

"We used PcapDroid — a packet capture tool — to record 24 hours of actual network traffic from this phone. Every line you see on this globe is a real connection from THIS phone to a tracker server somewhere in the world."

> *[Let the globe animate — arcs flying across the globe]*

"Watch the counter. By hour 6 — that's 6 AM, while the owner was **still sleeping** — the phone had already made over 800 connections to tracker servers. Your phone doesn't sleep. It's broadcasting your data to servers in the US, Ireland, Singapore, Germany, Japan — while you're unconscious."

> *[Point to the stats panel]*

"By the end of 24 hours: over **3,000 connections** to **X companies** across **X countries**. All happening in the background. Invisible. Silent."

> *[Point to Worst Offenders]*

"These are the worst offenders — the apps that phone home the most. Some of these are apps you trust with your most personal data."

---

## ACT TWO — The Contagion (1 minute)

> *[Click "Act Two"]*

**Say:**

"Here's where it gets personal. Act Two shows the *collateral damage*."

"When you give an app access to your contacts, you're not just sharing YOUR data — you're sharing THEIRS. This force-directed graph shows the contagion: how your friends and family get exposed to trackers through apps on YOUR phone, without ever giving consent."

> *[Point to ghost contacts]*

"These are **ghost contacts** — people in your phone who've been exposed to companies they've never even heard of. Your mom doesn't know that Facebook has her phone number because YOU installed WhatsApp. Your doctor doesn't know Google has their email because YOU use Gmail."

> *[Point to trust score]*

"This is your overall privacy trust score. It measures how much your digital footprint exposes not just you, but the people who trust you with their contact information."

---

## ACT THREE — The Reckoning (1 minute)

> *[Click "Act Three"]*

**Say:**

"We don't just show the problem — we give you weapons to fight back."

> *[Show App Grades]*

"First: **privacy grades**. Every app gets a letter grade based on its tracker count, permissions, and data practices. You can instantly see which apps are the worst offenders and which ones are safe."

> *[Show Blocking Panel]*

"Second: **tracker blocking simulation**. This shows what would happen if you installed a tracker blocker. See? Blocking just advertising and analytics trackers would eliminate **51% of all connections**. Half the traffic on your phone... was never for you."

> *[Show Deletion Panel]*

"Third: **legal weapons**. Under GDPR and India's DPDP Act, you have the right to request deletion of your data. We generate ready-to-send **deletion request PDFs** addressed to each tracker company's data protection officer, pre-filled with your data, citing the correct legal articles. One click, and you can send them all."

> *[Show Receipt Mockup]*

"And finally: the **data receipt**. If companies had to give you a receipt every time they took your data — like a store gives you a receipt when they take your money — this is what it would look like."

---

## ARCHITECTURE — The Tech (30 seconds)

**Say:**

"Quick tech overview. Two components:"

"One: a **Flutter scanner app** running on the phone. It scans installed packages, queries the Exodus Privacy tracker database, imports PcapDroid packet captures, and runs a local HTTP server to stream data to the dashboard."

"Two: a **React + TypeScript dashboard** built with Vite. Globe.gl and Three.js for 3D visualization, D3 and force-graphs for the contagion map, Recharts for data viz, Framer Motion for animations. All processing happens locally — **zero data leaves the device**."

---

## CLOSING — The Punchline (30 seconds)

**Say:**

"We started this project with a question: *What did you actually consent to?*"

"The answer is: you consented to 191 apps, embedding hundreds of trackers, making thousands of connections per day, sharing your data with companies across dozens of countries, and exposing your family and friends — all while you sleep."

"Privacy policies call this 'consent.' We call it theater."

"That's Consent Theater. Thank you."

> *[Pause for questions]*

---

## 🎯 Tips for Delivery

1. **Start with the question** — Gets judges engaged immediately
2. **Use the phone physically** — Hold it up when talking about scanning ("THIS phone")
3. **Point at the screen** — Direct their eyes to specific data points
4. **Use actual numbers** — "384 trackers" hits harder than "many trackers"
5. **Make it personal** — "YOUR mom" / "YOUR contacts" — not abstract hypotheticals
6. **Slow down on the globe** — Let the animation do the work. Silence is powerful while arcs fly.
7. **End on the name** — "Privacy policies call this consent. We call it theater." Mic drop.

## ❓ Anticipated Judge Questions (with answers)

**Q: Does this actually block trackers?**
A: The blocking panel is a simulation — it shows the impact. We intentionally don't block because some tracker-associated domains serve essential functions (push notifications, crash reporting). We focus on awareness and legal tools (GDPR deletion requests) instead.

**Q: How is the risk score calculated?**
A: Weighted combination of dangerous permissions (×8 points each, capped at 60) and embedded trackers (×10 each, capped at 40), on a 0–100 scale. Higher means more invasive.

**Q: Is the VPN data live or pre-recorded?**
A: Pre-recorded over 24 hours using PcapDroid. We chose this intentionally — live capture is unreliable in hackathon Wi-Fi conditions, and a full 24-hour dataset tells a much more compelling story than 5 minutes of live data.

**Q: What about iOS?**
A: The scanner currently targets Android due to its open package management APIs. iOS doesn't expose installed app lists to third-party apps. However, the dashboard can visualize data from any source — iOS packet captures could be imported in the same format.

**Q: How do you detect trackers?**
A: We use the Exodus Privacy database — an open-source, community-maintained database of tracker signatures maintained by a French nonprofit. It identifies trackers by matching code signatures and network patterns in app binaries.

**Q: Does any data leave the phone?**
A: No. The scanner runs a local HTTP server. The dashboard fetches data over the local network only. Nothing is sent to any cloud server. We believe a privacy tool that violates privacy is unacceptable.
