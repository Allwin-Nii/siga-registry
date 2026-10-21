# Selected entity-source register

This register supports the frontend demonstration seed data in `frontend/src/data/mockData.ts`. It is not a complete, official, or certified directory. SIGA's public directory was used to verify the category labels; entity sites and SIGA profiles were used for short descriptions and public contact information.

Verification date: **2026-10-21**.

| Seed establishment | Category verified from SIGA | Public detail source | Notes |
| --- | --- | --- | --- |
| Electricity Company of Ghana | [SIGA entity directory](https://siga.gov.gh/entities/) — SOE | [ECG contact page](https://ecg.com.gh/index.php/en/contact-us) | Uses the public help email and call-centre number. |
| Volta River Authority | [SIGA entity directory](https://siga.gov.gh/entities/) — SOE | [VRA official site](https://vra.com/index.php) | Uses corporate communications contact shown on the official site. |
| Ghana Ports and Harbours Authority | [SIGA entity directory](https://siga.gov.gh/entities/) — SOE | [GPHA contact page](https://ghanaports.gov.gh/contact) | Uses headquarters email and telephone number. |
| Ghana National Petroleum Corporation | [SIGA entity directory](https://siga.gov.gh/entities/) — SOE | [GNPC contact page](https://www.gnpcghana.com/contact-us) | Uses the official information email and headquarters number. |
| Ghana Cocoa Board | [SIGA entity profile](https://siga.gov.gh/entity/ghana-cocoa-board/) — SOE | [SIGA entity profile](https://siga.gov.gh/entity/ghana-cocoa-board/) | SIGA profile supplies the website, public-affairs email, number, and summary basis. |
| Ghana Post Company Limited | [SIGA entity profile](https://siga.gov.gh/entity/ghana-post-company-limited/) — SOE | [Ghana Post contact page](https://www.ghanapost.com.gh/contact/) | Uses SIGA's listed public email and number; Ghana Post contact page supports the public telephone number. |
| Ghana Oil Company Limited (GOIL) | [SIGA entity directory](https://siga.gov.gh/entities/) — JVC | [GOIL official site](https://www.goil.com.gh/) | Seed label follows the SIGA directory; GOIL's site currently brands the company as GOIL PLC. |
| Intercity STC Company | [SIGA entity profile](https://siga.gov.gh/?entity=intercity-stc-company) — JVC | [STC contact page](https://stc.gov.gh/contact) | Uses the official customer-service number and SIGA profile email/site. |
| Twifo Oil Palm Plantation | [SIGA entity directory](https://siga.gov.gh/entities/) — JVC | [TOPP about page](https://toppghana.com.gh/about/) | No email or telephone is seeded because a current public contact could not be confidently verified from the reviewed official source. |
| Forestry Commission | [SIGA OSE directory](https://siga.gov.gh/entity-type/ose/) — OSE | [Forestry Commission function page](https://fc.gov.gh/introduction-and-function/) and [corporate contacts](https://fc.gov.gh/corporate-headquaters/) | Uses headquarters public contact. |
| Ghana Highway Authority | [SIGA OSE directory](https://siga.gov.gh/entity-type/ose/) — OSE | [GHA contacts](https://highways.gov.gh/contacts) | Uses head-office email and telephone number. |
| Ghana Meteorological Agency | [SIGA OSE directory](https://siga.gov.gh/entity-type/ose/) — OSE | [GMet about page](https://www.meteo.gov.gh/organisation/about-us/) and [Ghana Electronic Procurement System record](https://www.ghaneps.gov.gh/epps/prepareViewCAOrganisation.do?id=12261) | Uses the government procurement record's public email and telephone number. |

## Data-handling notes

- Only the six existing establishment information fields are populated: name, website URL, category, email, contact number, and brief description.
- The source URL and verification date live in this development document rather than in profile fields.
- Contact values are public business contact details only; the project does not contain or log credentials.
- Public information can change. The profile view tells users to verify current details directly with the entity.
