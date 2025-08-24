// storage.js
// ImageKit storage integration with fallback to unsigned preset OR signed uploads

class ImageKitStorage {
  constructor() {
    this.urlEndpoint = "https://ik.imagekit.io/2v7bpla6v";
    this.publicKey = "public_aTE5JJek9Za9N0XM4KIgzX2EKAc=";
    this.backendAuthUrl = "http://localhost:3000/auth"; // Change if you deploy backend
  }

  // Detect if backend auth server is available
  async getAuthParams() {
    try {
      const res = await fetch(this.backendAuthUrl);
      if (!res.ok) throw new Error("Backend not reachable");
      return await res.json(); // { token, expire, signature }
    } catch (err) {
      console.warn("⚠️ Falling back to unsigned preset (no backend auth)", err);
      return null;
    }
  }

  // Upload file (auto-switch signed/unsigned)
  async uploadImage(file) {
    const authParams = await this.getAuthParams();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);

    let uploadUrl = "https://upload.imagekit.io/api/v1/files/upload";
    let headers = {};

    if (authParams) {
      // ✅ Signed upload using backend
      formData.append("token", authParams.token);
      formData.append("expire", authParams.expire);
      formData.append("signature", authParams.signature);
      headers = { Authorization: "Basic " + btoa(this.publicKey + ":") };
    } else {
      // ✅ Unsigned upload (preset must be created in ImageKit dashboard)
      formData.append("upload_preset", "unsigned_preset");
      headers = { Authorization: "Basic " + btoa(this.publicKey + ":") };
    }

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: formData,
      });
      return await response.json();
    } catch (err) {
      console.error("❌ Image upload failed:", err);
      return null;
    }
  }
}

export const imageKitStorage = new ImageKitStorage();
