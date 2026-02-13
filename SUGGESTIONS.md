# UnieFreight – Ideas & suggestions for the system

- **Fleet per state** – Backend already supports `fleetPerState` (truck types and counts per state). Add UI in Company tab to edit truck types/sizes and counts per state so warehouses can match capacity.
- **File upload for profile photo** – Today profile photo is URL-only; add direct upload (e.g. to S3 or your storage) and use returned URL for `profileImageUrl`.
- **Revenue tab** – Active jobs already shows “Revenue (approved)”. Optionally add a dedicated Revenue tab with history, by warehouse, and export.
- **Notifications** – Notify carriers when they win a job, when feedback is submitted, or when a document update is requested.
- **Mobile-friendly** – Ensure layout and forms work well on phones for drivers.
- **Document expiry alerts** – Warn carriers when insurance or authority is nearing expiry (using `expiresAt` on business files).
- **Rate cards** – Let carriers optionally set default rates per lane or per state for quicker quoting.
- **Broker score visibility** – Show warehouses’ response rate or average time-to-award so carriers can prioritize.
