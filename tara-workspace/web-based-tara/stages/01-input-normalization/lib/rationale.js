'use strict';

/**
 * Stage 01 Rationale items written while reading (specs 13a, 13b). C5 adds one per conflict.
 * Attention is set here by code, never by the model: these items touch existence of
 * components, the environment, or scope, so they need the analyst's attention, except
 * a guessed document type, which is information.
 */

class RationaleBook {
  constructor() {
    this.items = [];
  }

  add(item) {
    const id = `RAT-${String(this.items.length + 1).padStart(3, '0')}`;
    this.items.push({ rationale_id: id, stage: '01', review: { status: 'unreviewed' }, ...item });
    return id;
  }

  fileSource(doc) {
    return { doc_id: doc.doc_id, location: 'file name', quote: doc.client_doc_ref };
  }

  unreadable(doc, partial) {
    return this.add({
      kind: 'gap',
      attention: 'needs_attention',
      title: partial ? `Part of ${doc.client_doc_ref} could not be read` : `${doc.client_doc_ref} could not be read`,
      concluded: partial
        ? `Only part of ${doc.client_doc_ref} was read. ${doc.read_status_reason}`
        : `Nothing from ${doc.client_doc_ref} is used. ${doc.read_status_reason}`,
      why: { sources: [this.fileSource(doc)] },
      assumed: 'The run continues with the other documents. Anything only this file describes is missing from the results.',
      would_change: `A readable copy of ${doc.client_doc_ref}, sent again by the client.`,
      affects: [doc.doc_id],
    });
  }

  unknownEnvironment(doc) {
    return this.add({
      kind: 'gap',
      attention: 'needs_attention',
      title: `Which environment does ${doc.client_doc_ref} describe?`,
      concluded: `${doc.client_doc_ref} does not say whether it describes production, staging or development.`,
      why: { sources: [this.fileSource(doc)] },
      assumed: 'It is read as describing production, the environment being assessed.',
      would_change: 'The client saying which environment the document describes.',
      affects: [doc.doc_id],
    });
  }

  guessedType(doc) {
    return this.add({
      kind: 'assumption',
      attention: 'information',
      title: `No document type was chosen for ${doc.client_doc_ref}`,
      concluded: `${doc.client_doc_ref} was uploaded without a type, so it is treated as ${doc.doc_type === 'other' ? 'an unclassified document' : `a ${doc.doc_type.replace(/_/g, ' ')}`}.`,
      why: { sources: [this.fileSource(doc)] },
      assumed: `Its weight against other documents follows that type (rank ${doc.precedence_rank}).`,
      would_change: 'Choosing the right type for the document.',
      affects: [doc.doc_id],
    });
  }

  labelsDiffer(imageDoc, sourceDoc, onlyInImage, onlyInSource) {
    const parts = [];
    if (onlyInSource.length) parts.push(`In the source file but not read from the image: ${onlyInSource.join(', ')}.`);
    if (onlyInImage.length) parts.push(`Read from the image but not in the source file: ${onlyInImage.join(', ')}.`);
    return this.add({
      kind: 'ambiguity',
      attention: 'needs_attention',
      title: `${imageDoc.client_doc_ref} and ${sourceDoc.client_doc_ref} do not show the same labels`,
      concluded: `The image is treated as a copy of the source diagram, but their labels differ. ${parts.join(' ')}`,
      why: { sources: [this.fileSource(imageDoc), this.fileSource(sourceDoc)] },
      assumed: 'The source file is used, because it is read exactly; the image adds nothing.',
      would_change: 'The client confirming that the image is an older or newer version of the diagram.',
      affects: [imageDoc.doc_id, sourceDoc.doc_id],
    });
  }

  unclearArrows(doc, arrows) {
    const list = arrows.map((a) => `${a.from || '?'} to ${a.to || '?'}`).join('; ');
    return this.add({
      kind: 'ambiguity',
      attention: 'needs_attention',
      title: `Some arrows in ${doc.client_doc_ref} could not be read clearly`,
      concluded: `These arrows were seen, but their ends or direction are unclear: ${list}.`,
      why: { sources: [this.fileSource(doc)] },
      assumed: 'No connection is recorded for them.',
      would_change: 'The client confirming what each arrow connects.',
      affects: [doc.doc_id],
    });
  }
}

module.exports = { RationaleBook };
