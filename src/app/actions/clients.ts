"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClientWorkdriveFolder } from "@/lib/zoho";

export type AddClientState = { error?: string; success?: boolean; warning?: string };

const VALID_STAGES = new Set(["stage_1", "stage_2", "stage_3"]);

export async function addClient(
  _prevState: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const stage = String(formData.get("stage") ?? "stage_1");
  const workdriveFolderUrl = String(formData.get("workdriveFolderUrl") ?? "").trim();

  if (!companyName) {
    return { error: "Company name is required." };
  }
  if (!VALID_STAGES.has(stage)) {
    return { error: "Invalid stage." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      company_name: companyName,
      case_manager_id: user.id,
      workdrive_folder_url: workdriveFolderUrl || null,
    })
    .select("id")
    .single();

  if (clientErr) {
    return { error: `Could not create client: ${clientErr.message}` };
  }

  let warning: string | undefined;

  if (!workdriveFolderUrl) {
    try {
      const folder = await createClientWorkdriveFolder(companyName);
      const { error: folderUpdateErr } = await supabase
        .from("clients")
        .update({
          zoho_workdrive_folder_id: folder.folderId,
          workdrive_folder_url: folder.permalink,
          workdrive_share_link: folder.shareLink,
        })
        .eq("id", client.id);

      if (folderUpdateErr) {
        warning = `WorkDrive folder was created but could not be saved: ${folderUpdateErr.message}`;
      }
    } catch (err) {
      warning = `Client created, but the WorkDrive folder could not be created automatically (${
        err instanceof Error ? err.message : String(err)
      }). Link one manually from the case page.`;
    }
  }

  const { data: application, error: appErr } = await supabase
    .from("applications")
    .insert({ client_id: client.id, stage })
    .select("id")
    .single();

  if (appErr) {
    return { error: `Could not create application: ${appErr.message}` };
  }

  const { data: templates, error: templatesErr } = await supabase
    .from("checklist_templates")
    .select("id, owner_tag")
    .eq("stage", stage)
    .eq("is_active", true);

  if (templatesErr) {
    return { error: `Could not load checklist: ${templatesErr.message}` };
  }

  if (templates && templates.length > 0) {
    const { error: docsErr } = await supabase.from("documents").insert(
      templates.map((template) => ({
        application_id: application.id,
        checklist_template_id: template.id,
        owner_tag: template.owner_tag,
        status: "missing" as const,
      })),
    );

    if (docsErr) {
      return { error: `Could not create checklist items: ${docsErr.message}` };
    }
  }

  revalidatePath("/");
  return { success: true, warning };
}

export async function updateWorkdriveFolderUrl(
  clientId: string,
  applicationId: string,
  workdriveFolderUrl: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("clients")
    .update({ workdrive_folder_url: workdriveFolderUrl.trim() || null })
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}
