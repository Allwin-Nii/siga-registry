# Institution image uploads and location maps

## Uploaded images

Institution logos and cover images are stored on the application filesystem, not in MySQL. Configure `UPLOADS_DIRECTORY` to a durable, writable directory owned by the application account. In production, mount this directory as a persistent volume and include it in normal backup and restore procedures.

The application exposes that directory read-only at `/uploads`. The database stores only a generated relative reference such as `/uploads/logo-<uuid>.png`; deployed frontend clients resolve it against the API origin. The upload endpoint is administrator-authenticated and CSRF-protected, accepts only PNG, JPEG, and WebP files, validates the file signature and declared MIME type, and limits logos to 5 MB and cover images to 10 MB.

Back up the upload directory together with the database. Restoring the database without its matching upload directory will leave image references without files.

## Google Maps

Set the following frontend environment variable to enable Google place suggestions, the embedded map, and draggable pin selection:

```env
VITE_GOOGLE_MAPS_API_KEY=your_browser_restricted_key
```

Enable the **Maps JavaScript API** and **Places API** for the key in the Google Cloud project. Restrict the browser key to the production and development web origins used by the SIGA Registry; do not put a server-side or unrestricted key in this variable.

Without that configuration, entity creation and editing remain available: administrators can save a physical address and optional coordinates, and the UI provides a Google Maps search link. No Google Maps request is made and no map is rendered in that fallback state.
