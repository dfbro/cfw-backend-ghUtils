CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Menggunakan UUID
    username TEXT NOT NULL UNIQUE, -- Wajib diisi dan tidak boleh kembar
    email TEXT UNIQUE, -- Email juga biasanya dibuat unik
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);