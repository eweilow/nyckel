// encrypt and decrypt are adapted from https://github.com/JamesMGreene/node-aes256/blob/master/index.js
// Original license:
/*
The MIT License (MIT)

Copyright (c) 2015 James M. Greene

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import crypto from "crypto";

const rawTextEncoding = "utf8";
const encryptionEncoding = "base64";
const cipherType = "aes-256-ctr";

export function encrypt(key: string, plaintext: string) {
  if (typeof key !== "string" || !key) {
    throw new TypeError('Provided "key" must be a non-empty string');
  }
  if (typeof plaintext !== "string" || !plaintext) {
    throw new TypeError('Provided "plaintext" must be a non-empty string');
  }

  var sha256 = crypto.createHash("sha256");
  sha256.update(key);

  // Initialization Vector
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv(cipherType, sha256.digest(), iv);

  var ciphertext = cipher.update(Buffer.from(plaintext, rawTextEncoding));
  var encrypted = Buffer.concat([iv, ciphertext, cipher.final()]).toString(
    encryptionEncoding
  );

  return encrypted;
}

export function decrypt(key: string, encrypted: string) {
  if (typeof key !== "string" || !key) {
    throw new TypeError('Provided "key" must be a non-empty string');
  }
  if (typeof encrypted !== "string" || !encrypted) {
    throw new TypeError('Provided "encrypted" must be a non-empty string');
  }

  var sha256 = crypto.createHash("sha256");
  sha256.update(key);

  var input = Buffer.from(encrypted, "base64");

  if (input.length < 17) {
    throw new TypeError(
      'Provided "encrypted" must decrypt to a non-empty string'
    );
  }

  var iv = input.slice(0, 16);
  var decipher = crypto.createDecipheriv(cipherType, sha256.digest(), iv);

  var ciphertext = input.slice(16);
  var plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString(rawTextEncoding);

  return plaintext;
}
