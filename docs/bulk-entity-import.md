# Bulk Entity Import

Administrators can open **Entities** and select **Import**. The workflow accepts one `.xlsx` or UTF-8 `.csv` file up to 5 MB and 500 entity rows. The preview validates the entire file without creating records. Importing requires an explicit confirmation and creates only draft entities.

## Template columns

Download the template from the import page. Its `Entities` worksheet supports:

- Entity Name
- Category (`SOE`, `JVC`, or `OSE`)
- Website URL
- Email Address
- Contact Number

`Entity Name` and `Category` are required. The other three fields are optional. The importer accepts only these five columns and flags unexpected or duplicate headers. Imported records receive a draft-only placeholder description to satisfy the registry's existing required-description rule; complete the description, images, supervising ministry, location details, and members through entity management after import.

## Validation and confirmation

The preview reports the spreadsheet row number and field-specific errors for missing required values, malformed values, invalid categories, records over database field limits, duplicates within the file, and case-insensitive duplicates already in the registry. It also produces a CSV error report. Values that could be interpreted as spreadsheet formulas are escaped in that report.

The preview is stored in application memory for 15 minutes and is intentionally lost on an application restart. At confirmation time every valid row is validated again through the normal administrator entity creator. Each row uses its own database transaction; a later conflict is reported as a skipped duplicate and does not overwrite an existing entity or roll back prior successful imports.

## Testing manually

1. Sign in as an administrator and download the template.
2. Add a row with a unique name and a valid category.
3. Upload the file and verify the preview reports no database write.
4. Confirm the import and verify the new record appears in Entities as a draft.
5. Use **Manage entity** to upload local images, refine the location, add members, and publish through the normal workflow.
