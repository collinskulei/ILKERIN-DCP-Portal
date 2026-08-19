const ZOHO_ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN ?? "accounts.zoho.com";
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN ?? "https://www.zohoapis.com";

async function getAccessToken(): Promise<string> {
  const res = await fetch(`https://${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}

async function zohoApi(path: string, init: RequestInit) {
  const accessToken = await getAccessToken();
  const res = await fetch(`${ZOHO_API_DOMAIN}${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      ...init.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || data.errors) {
    throw new Error(`Zoho API error (${path}): ${JSON.stringify(data)}`);
  }

  return data;
}

export type ClientWorkdriveFolder = {
  folderId: string;
  permalink: string;
  shareLink: string;
};

/**
 * Creates a subfolder for a new client under ZOHO_CLIENTS_PARENT_FOLDER_ID,
 * then generates an upload-permission external share link for it.
 */
export async function createClientWorkdriveFolder(
  companyName: string,
): Promise<ClientWorkdriveFolder> {
  const parentId = process.env.ZOHO_CLIENTS_PARENT_FOLDER_ID;
  if (!parentId) {
    throw new Error("ZOHO_CLIENTS_PARENT_FOLDER_ID is not configured");
  }

  const folderRes = await zohoApi("/workdrive/api/v1/files", {
    method: "POST",
    body: JSON.stringify({
      data: { attributes: { name: companyName, parent_id: parentId }, type: "files" },
    }),
  });

  const folderId = folderRes.data.id as string;
  const permalink = folderRes.data.attributes.permalink as string;

  const linkRes = await zohoApi("/workdrive/api/v1/links", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          resource_id: folderId,
          link_name: `${companyName} upload link`,
          request_user_data: false,
          allow_download: true,
          role_id: "7", // 7 = view + upload
        },
        type: "links",
      },
    }),
  });

  const shareLink = linkRes.data.attributes.link as string;

  return { folderId, permalink, shareLink };
}
