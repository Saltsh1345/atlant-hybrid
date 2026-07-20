/**
 * Atlant-Hybrid stage passport receiver.
 *
 * Required Script Properties:
 * ATLANT_PASSPORT_SECRET
 * ATLANT_PASSPORT_FOLDER_ID
 */
function doPost(event) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    lock.waitLock(10000);
    lockAcquired = true;

    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty("ATLANT_PASSPORT_SECRET");
    const folderId = properties.getProperty("ATLANT_PASSPORT_FOLDER_ID");

    if (!expectedSecret || !folderId) {
      return jsonResponse_({ ok: false, error: "Script Properties are not configured." });
    }

    const payload = JSON.parse(event.postData.contents || "{}");

    if (payload.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: "Unauthorized." });
    }

    if (!payload.title || typeof payload.markdown !== "string") {
      return jsonResponse_({ ok: false, error: "title and markdown are required." });
    }

    const folder = DriveApp.getFolderById(folderId);
    const document = findOrCreateDocument_(folder, String(payload.title));
    const body = document.getBody();

    body.clear();
    body.setText(payload.markdown);
    document.saveAndClose();

    return jsonResponse_({
      ok: true,
      documentId: document.getId(),
      documentUrl: document.getUrl(),
      title: document.getName(),
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function findOrCreateDocument_(folder, title) {
  const files = folder.getFilesByName(title);

  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
      return DocumentApp.openById(file.getId());
    }
  }

  const document = DocumentApp.create(title);
  DriveApp.getFileById(document.getId()).moveTo(folder);
  return document;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
