"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logCbkQuery(applicationId: string, formData: FormData) {
  const queryText = String(formData.get("queryText") ?? "").trim();
  const receivedDate = String(formData.get("receivedDate") ?? "").trim();
  const responseDeadline = String(formData.get("responseDeadline") ?? "").trim();

  if (!queryText) {
    return { error: "Query text is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: correspondence, error: correspondenceErr } = await supabase
    .from("cbk_correspondence")
    .insert({
      application_id: applicationId,
      query_text: queryText,
      received_date: receivedDate || undefined,
      response_deadline: responseDeadline || null,
    })
    .select("id")
    .single();

  if (correspondenceErr) {
    return { error: correspondenceErr.message };
  }

  // Per the automation rule in PLAN.md: a CBK query received creates a task
  // with the response deadline as its due date.
  const { error: taskErr } = await supabase.from("tasks").insert({
    application_id: applicationId,
    title: `Respond to CBK query: ${queryText.slice(0, 80)}`,
    due_date: responseDeadline || null,
    owner_id: user.id,
    linked_entity_type: "cbk_correspondence",
    linked_entity_id: correspondence.id,
  });

  if (taskErr) {
    return { error: `Query logged, but the linked task could not be created: ${taskErr.message}` };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

export async function markCbkResponded(
  correspondenceId: string,
  applicationId: string,
  responseText: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("cbk_correspondence")
    .update({ response_status: "responded", response_text: responseText })
    .eq("id", correspondenceId);

  if (error) {
    return { error: error.message };
  }

  // Close the linked task, if one exists.
  await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("linked_entity_type", "cbk_correspondence")
    .eq("linked_entity_id", correspondenceId);

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}
