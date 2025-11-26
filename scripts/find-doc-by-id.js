#!/usr/bin/env node
import admin from '../api/firebaseAdmin.js'

const db = admin.firestore()

async function checkDocInCollection(collectionRef, docId) {
  const docRef = collectionRef.doc(docId)
  const snap = await docRef.get()
  return snap.exists
}

async function findRecursively(docId) {
  const found = []
  const cols = await db.listCollections()
  for (const c of cols) {
    // Check root-level doc
    try {
      const exists = await checkDocInCollection(c, docId)
      if (exists) found.push(`${c.id}/${docId}`)
    } catch (e) {
      // ignore
    }
    // Scan documents in this collection to check subcollections
    const snapshot = await c.limit(500).get()
    for (const doc of snapshot.docs) {
      const subCols = await doc.ref.listCollections()
      for (const sc of subCols) {
        try {
          const exists = await checkDocInCollection(sc, docId)
          if (exists) found.push(`${c.id}/${doc.id}/${sc.id}/${docId}`)
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return found
}

async function main() {
  const docId = process.argv[2]
  if (!docId) {
    console.error('Usage: node find-doc-by-id.js <docId>')
    process.exit(2)
  }
  console.log('Searching for document id:', docId)
  try {
    const found = await findRecursively(docId)
    if (!found.length) {
      console.log('No documents found with id', docId)
    } else {
      console.log('Found at:')
      for (const p of found) console.log('-', p)
    }
    process.exit(0)
  } catch (err) {
    console.error('Error searching for doc:', err)
    process.exit(2)
  }
}

main()
