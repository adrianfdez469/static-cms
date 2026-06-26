"use server";

import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  validateCredentials,
} from "@/lib/auth";
import { revalidateAfterFileChange } from "@/lib/revalidateCms";
import {
  createFile,
  deleteFile,
  getBucketStatus,
  getFileTree,
  indexMdExistsAtPath,
  initializeCmsBucket,
  readFile,
  saveFile,
  uploadFile,
} from "@/lib/storageAdmin";

function actionError(message) {
  return { ok: false, error: message };
}

function actionSuccess(data = {}) {
  return { ok: true, ...data };
}

export async function loginAction(formData) {
  const username = formData.get("username")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!validateCredentials(username, password)) {
    return { error: "Invalid username or password" };
  }

  await setSessionCookie();
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function getTreeAction() {
  try {
    await requireAuth();
    const [tree, status] = await Promise.all([getFileTree(), getBucketStatus()]);
    return actionSuccess({ tree, needsInitialization: status.needsInitialization });
  } catch (error) {
    return actionError(error.message);
  }
}

export async function initializeCmsAction() {
  try {
    await requireAuth();
    const result = await initializeCmsBucket();
    return actionSuccess(result);
  } catch (error) {
    return actionError(error.message);
  }
}

export async function readFileAction(path) {
  try {
    await requireAuth();
    const content = await readFile(path);
    return actionSuccess({ content });
  } catch (error) {
    return actionError(error.message);
  }
}

export async function saveFileAction(path, content) {
  try {
    await requireAuth();
    await saveFile(path, content);
    await revalidateAfterFileChange(path);
    return actionSuccess();
  } catch (error) {
    return actionError(error.message);
  }
}

export async function deleteFileAction(path) {
  try {
    await requireAuth();
    await deleteFile(path);
    await revalidateAfterFileChange(path);
    return actionSuccess();
  } catch (error) {
    return actionError(error.message);
  }
}

export async function indexMdExistsAction(parentPath, relativePath) {
  try {
    await requireAuth();
    const result = await indexMdExistsAtPath(parentPath, relativePath);
    return actionSuccess(result);
  } catch (error) {
    return actionError(error.message);
  }
}

export async function createFileAction(parentPath, relativePath) {
  try {
    await requireAuth();
    const filePath = await createFile(parentPath, relativePath);
    await revalidateAfterFileChange(filePath);
    return actionSuccess({ path: filePath });
  } catch (error) {
    return actionError(error.message);
  }
}

export async function uploadFileAction(parentPath, relativePath, formData) {
  try {
    await requireAuth();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return actionError("No file was received");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await uploadFile(parentPath, relativePath?.trim() ?? "", buffer);
    await revalidateAfterFileChange(filePath);
    return actionSuccess({ path: filePath });
  } catch (error) {
    return actionError(error.message);
  }
}
