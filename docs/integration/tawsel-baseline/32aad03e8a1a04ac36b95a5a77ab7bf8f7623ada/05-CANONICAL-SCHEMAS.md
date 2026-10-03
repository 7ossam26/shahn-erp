# Complete canonical JSON Schemas

Source commit: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. Extracted: 2026-09-25T08:22:32.982Z.

Original blocks below are verbatim source text, not rewritten contracts. Their SHA-256 hashes refer to original bytes. Resolve relative schema references using the original path above the block and the companion schema attachment. No repo/network access is needed to read those blocks. Descriptions/fixtures do not override operation authentication or lifecycle.

## File index

29 complete schemas. Each schema is embedded once below. Feature schemas can be stricter than common foundations.

| Original file | Definition count | SHA-256 |
| --- | --- | --- |
| contracts/action-envelope.v1.schema.json | 0 | 3e134a59e3cf8415df51800e84949db6f7ccf25c8b54e899f7f179f10f59cf56 |
| contracts/action-result.v1.schema.json | 0 | b59e970270e82122f08c3017ad9aabb771de6592b10eec80ec75a2636c486426 |
| contracts/b2b-intake.schema.json | 22 | 133b951077bab6448f4c0b760543253c6225a588ec00bf4c5f9544fdf8b53d04 |
| contracts/b2c-intake.schema.json | 14 | 5c9cdea25786dc8656ce7a8ec874d073aede9446e4ed6c7a1b04bc7f0135197d |
| contracts/branch-activity.schema.json | 7 | b068d838956b603eb1e071e0c2fde2ad2a7abd7b32e3721262b68cf3e481c59b |
| contracts/common.schema.json | 38 | 2379916f4108d10d8b1176819eaf8f998edb8bc20e951ef73622979a60a3df81 |
| contracts/consumer.schema.json | 9 | cbff563ea8ea28a6af9f557e85bab0097c89a095d2cb6ca74e3d066d26352fe1 |
| contracts/corrections.schema.json | 11 | 6f44c84bd6adc1a39ee0d3f5c01c27f7d3041523c4295243f8672fbdff91aae6 |
| contracts/current-activity.schema.json | 20 | 7a471aaa12d404c886b4baa33061f0fe8fd908395c8c083bd602c77543444fa4 |
| contracts/device-ownership.schema.json | 14 | 4fadce037f2cae24b52cd35697623339a5d70ce85244312ff26af97c50cd42f3 |
| contracts/eligibility.schema.json | 16 | 15e474f47d2695d6d3794ed38a87750502e6402098494ef0f5a98aa5196ef089 |
| contracts/events/envelope.v1.schema.json | 0 | d723d62d419e5fe20f896481df0d54ef6b94d8437d19f3057cc47f199eba7ccd |
| contracts/events/sender-event.v1.schema.json | 0 | cbce5b5128d8d2f5cf6c58668c989e6b403876531703921a16834dbcf9fb1f06 |
| contracts/evidence-receipt.v1.schema.json | 0 | ee3d27729454cb915ff9f01fbac5ebb2d9a5c9ead0b1521357f05fb6cef71e9e |
| contracts/local-work.schema.json | 6 | 8e3dac6fe46e12fbfcbe5b9a36c2dfd96fdfd7788e001a9c74399b67a831bd0b |
| contracts/location.schema.json | 10 | fdffb5d3be3b2dd413f32b8a574dd6ac4c3a882dc53aaefc0f6209dbc233333c |
| contracts/monitoring.schema.json | 17 | 0fbf77e77b680b7efb5da297c7d313e3f315ebf7b76a630b732af842b6aea3f6 |
| contracts/outbox.schema.json | 15 | acae29b68e9e267b2d1f495c6904880f421f3959684a3c14c8fa7c40f34bbf5b |
| contracts/outcomes.schema.json | 20 | 909bfc5356faa2150077754845a4f83c7328fcfe58571254e701edeab1c72927 |
| contracts/planning.schema.json | 22 | 036bd75af7d42081afd48e6688f6bb14f9f840239d39be1c67d87aacace7f04e |
| contracts/provisioning.schema.json | 28 | a6fe07968bcc85452431ff858764fc934b740ee522ab968859dcd2a0da7679b8 |
| contracts/reporting.schema.json | 17 | 3a6cb386d62c2a25656f5ea5068c713cfef767a6185eb11f291a570b8f4c82d7 |
| contracts/returns.schema.json | 25 | 4f2c517fb110241dc841addab69b74aead712b5604cd642138ce1473d8f6949f |
| contracts/round-start.schema.json | 11 | 86f030f677de2adfa1dce5dea1d8a5391c70dc2c3d86b7d346039380f94e629b |
| contracts/routing.schema.json | 15 | 164fe51675a27b82b1ff6cba92c88a4a768bbbe3406cb50a549343e6a340e793 |
| contracts/session.schema.json | 10 | 4e36e094d482ff40e7964733fce8c30433b61844234b786b863de378470d2684 |
| contracts/source.schema.json | 3 | a715ce999fdca0d7dff7cef0877f65ac6b9a6fc4813fc1341978c83b4e529ae3 |
| contracts/sync.schema.json | 4 | d5e8884719dade7563fa2cdc69bbe5845ae58849c7eb4ae38661d6dd1a8fb977 |
| contracts/workday-closure.schema.json | 13 | fd695fffc90989241c77157deaa758203c9d0b8d0b7cc5a90ac55f9e9cfb9c68 |

## Original file: contracts/action-envelope.v1.schema.json

SHA-256: `3e134a59e3cf8415df51800e84949db6f7ccf25c8b54e899f7f179f10f59cf56` · Bytes: 1916.

<!-- SOURCE-BEGIN contracts/action-envelope.v1.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/action-envelope.v1.schema.json",
  "title": "Action envelope v1 — designed",
  "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "payloadVersion": {
      "const": "1.0.0"
    },
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "operationId": {
      "$ref": "./common.schema.json#/$defs/OperationId"
    },
    "context": {
      "$ref": "./common.schema.json#/$defs/CommandContext"
    },
    "resources": {
      "$ref": "./common.schema.json#/$defs/ResourceContext"
    },
    "baseVersions": {
      "$ref": "./common.schema.json#/$defs/Versions"
    },
    "dependsOnActionIds": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      },
      "uniqueItems": true,
      "maxItems": 100
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "type": "object",
      "description": "Envelope validation only. Feature owner MUST validate the operation-specific versioned payload before any acceptance.",
      "additionalProperties": true
    }
  },
  "required": [
    "schemaVersion",
    "payloadVersion",
    "actionId",
    "operationId",
    "context",
    "resources",
    "baseVersions",
    "dependsOnActionIds",
    "observation",
    "payload"
  ],
  "additionalProperties": false
}

````
<!-- SOURCE-END contracts/action-envelope.v1.schema.json -->

## Original file: contracts/action-result.v1.schema.json

SHA-256: `b59e970270e82122f08c3017ad9aabb771de6592b10eec80ec75a2636c486426` · Bytes: 1806.

<!-- SOURCE-BEGIN contracts/action-result.v1.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/action-result.v1.schema.json",
  "title": "Durable command result v1",
  "description": "Durable scoped command result. P20 exposes action.getResult for authorized round execution/takeover actions; other families retain their feature adapters. Compacted results preserve identity and never execute again; unresolved evidence is held, full responses last at least 30 days.",
  "type": "object",
  "properties": {
    "receipt": { "$ref": "./evidence-receipt.v1.schema.json" },
    "operationId": { "$ref": "./common.schema.json#/$defs/OperationId" },
    "retention": { "enum": ["full", "compacted"] },
    "summary": { "type": "object", "additionalProperties": true, "description": "Minimal stable feature identity/revision references, retained for the business-record lifetime; not a copy of the full response or personal contact details." },
    "response": {
      "type": "object",
      "properties": {
        "status": { "type": "integer", "minimum": 200, "maximum": 599 },
        "body": { "type": "object", "additionalProperties": true }
      },
      "required": ["status", "body"],
      "additionalProperties": false
    }
  },
  "required": ["receipt", "operationId", "retention", "summary"],
  "additionalProperties": false,
  "allOf": [
    {
      "if": { "properties": { "retention": { "const": "full" } }, "required": ["retention"] },
      "then": { "properties": { "response": true }, "required": ["response"] },
      "else": { "not": { "properties": { "response": true }, "required": ["response"] } }
    },
    {
      "properties": { "receipt": { "type": "object", "properties": { "businessStatus": { "enum": ["accepted", "rejected", "review-required"] } } } }
    }
  ]
}

````
<!-- SOURCE-END contracts/action-result.v1.schema.json -->

## Original file: contracts/b2b-intake.schema.json

SHA-256: `133b951077bab6448f4c0b760543253c6225a588ec00bf4c5f9544fdf8b53d04` · Bytes: 28322.

<!-- SOURCE-BEGIN contracts/b2b-intake.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/b2b-intake.schema.json",
  "title": "ERP source snapshots and atomic admission v1",
  "description": "Exact outstanding EGP minor units per stable source line. Different per-piece allocations require distinct stable source lines. No deposit aggregate or implicit zero. Receipt is a source assertion, not Engine success. One dispatch cycle per shipment until P22.",
  "$defs": {
    "Money": {
      "type": "object",
      "properties": {
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currency": {
          "const": "EGP"
        },
        "exponent": {
          "const": 2
        }
      },
      "required": [
        "amountMinor",
        "currency",
        "exponent"
      ],
      "additionalProperties": false
    },
    "Line": {
      "type": "object",
      "properties": {
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "description": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200,
          "pattern": "\\S"
        },
        "quantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        },
        "unitDue": {
          "$ref": "#/$defs/Money"
        }
      },
      "required": [
        "sourceLineId",
        "description",
        "quantity",
        "unitDue"
      ],
      "additionalProperties": false
    },
    "SourceSnapshot": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "sourceBranchExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceOrderReference": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "recipientName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200,
          "pattern": "\\S"
        },
        "recipientPhone": {
          "$ref": "./b2c-intake.schema.json#/$defs/RecipientPhone"
        },
        "destination": {
          "$ref": "./b2c-intake.schema.json#/$defs/IndependentDestination"
        },
        "splittingAllowed": {
          "type": "boolean"
        },
        "allocation": {
          "const": "exact-outstanding-per-unit"
        },
        "lines": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Line"
          },
          "minItems": 1,
          "maxItems": 100
        },
        "shippingDue": {
          "$ref": "#/$defs/Money"
        },
        "totalDue": {
          "$ref": "#/$defs/Money"
        },
        "priority": {
          "enum": [
            "ordinary",
            "urgent"
          ]
        },
        "earliestAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "instructions": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000,
          "pattern": "\\S"
        }
      },
      "required": [
        "externalId",
        "sourceDispatchCycleId",
        "sourceRevision",
        "expectedSourceRevision",
        "sourceBranchExternalId",
        "recipientName",
        "recipientPhone",
        "destination",
        "splittingAllowed",
        "allocation",
        "lines",
        "shippingDue",
        "totalDue",
        "priority"
      ],
      "additionalProperties": false
    },
    "AssignmentReference": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "expectedSourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        }
      },
      "required": [
        "externalId",
        "sourceDispatchCycleId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "assignmentRevision"
      ],
      "additionalProperties": false
    },
    "Prepare": {
      "type": "object",
      "properties": {
        "driverExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/AssignmentReference"
          },
          "minItems": 1,
          "maxItems": 100
        }
      },
      "required": [
        "driverExternalId",
        "items"
      ],
      "additionalProperties": false
    },
    "ReceiveBatch": {
      "type": "object",
      "properties": {
        "driverExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/AssignmentReference"
          },
          "minItems": 1,
          "maxItems": 100
        },
        "receiptAsserted": {
          "const": true
        }
      },
      "required": [
        "driverExternalId",
        "items",
        "receiptAsserted"
      ],
      "additionalProperties": false
    },
    "Withdraw": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "expectedSourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        }
      },
      "required": [
        "externalId",
        "sourceDispatchCycleId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "assignmentRevision"
      ],
      "additionalProperties": false
    },
    "Reassign": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "expectedSourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "driverExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "receiptAsserted": {
          "type": "boolean"
        }
      },
      "required": [
        "externalId",
        "sourceDispatchCycleId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "assignmentRevision",
        "driverExternalId",
        "receiptAsserted"
      ],
      "additionalProperties": false
    },
    "Urgency": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "expectedSourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "priority": {
          "enum": [
            "ordinary",
            "urgent"
          ]
        }
      },
      "required": [
        "externalId",
        "sourceDispatchCycleId",
        "expectedSourceRevision",
        "sourceRevision",
        "priority"
      ],
      "additionalProperties": false
    },
    "SourceSnapshotCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "intake.submitSnapshot"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/SourceSnapshot"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "PrepareCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "intake.prepare"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Prepare"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "ReceiveBatchCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "assignment.receiveBatch"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/ReceiveBatch"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "WithdrawCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "assignment.withdraw"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Withdraw"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "ReassignCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "assignment.reassignBeforeDeparture"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Reassign"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "UrgencyCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "intake.setUrgencyBeforeDeparture"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Urgency"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "Task": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "state": {
          "enum": [
            "unassigned",
            "prepared",
            "held",
            "withdrawn"
          ]
        },
        "driverId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "driverExternalId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/ExternalId"
            },
            {
              "type": "null"
            }
          ]
        },
        "receivedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "editable": {
          "type": "boolean"
        },
        "planningEligible": {
          "type": "boolean"
        },
        "planningStatus": {
          "type": "string",
          "enum": [
            "not-requested",
            "pending",
            "running",
            "complete",
            "partial",
            "failed",
            "superseded"
          ],
          "description": "Actual latest durable calculation state; complete is a provider candidate, not an active round or policy guarantee."
        },
        "locationReadiness": {
          "enum": [
            "needs-resolution",
            "confirmed"
          ]
        },
        "snapshot": {
          "$ref": "#/$defs/SourceSnapshot"
        },
        "previousDispatchCycleId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "latest": {
          "type": "boolean"
        }
      },
      "required": [
        "taskId",
        "dispatchCycleId",
        "externalId",
        "sourceDispatchCycleId",
        "sourceRevision",
        "assignmentRevision",
        "state",
        "driverId",
        "driverExternalId",
        "receivedAt",
        "editable",
        "planningEligible",
        "planningStatus",
        "locationReadiness",
        "snapshot"
      ],
      "additionalProperties": false
    },
    "TaskList": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Task"
          },
          "maxItems": 100
        },
        "nextCursor": {
          "type": "string"
        }
      },
      "required": [
        "items"
      ],
      "additionalProperties": false
    },
    "BatchResult": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "pending",
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "./action-result.v1.schema.json"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    "ChangedEvent": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "task": {
          "$ref": "#/$defs/Task"
        }
      },
      "required": [
        "actionId",
        "task"
      ],
      "additionalProperties": false
    },
    "Redispatch": {
      "type": "object",
      "properties": {
        "externalId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        },
        "previousDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "snapshot": {
          "$ref": "#/$defs/SourceSnapshot"
        }
      },
      "required": [
        "externalId",
        "previousDispatchCycleId",
        "snapshot"
      ],
      "additionalProperties": false
    },
    "RedispatchCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "dispatch.createFromReceipt"
            },
            "context": {
              "$ref": "./common.schema.json#/$defs/IntegrationContext"
            },
            "payload": {
              "$ref": "#/$defs/Redispatch"
            }
          },
          "required": [
            "operationId",
            "context",
            "payload"
          ]
        }
      ]
    },
    "CycleList": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "$ref": "#/$defs/Task"
          }
        },
        "nextCursor": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "items",
        "nextCursor"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/b2b-intake.schema.json -->

## Original file: contracts/b2c-intake.schema.json

SHA-256: `5c9cdea25786dc8656ce7a8ec874d073aede9446e4ed6c7a1b04bc7f0135197d` · Bytes: 6614.

<!-- SOURCE-BEGIN contracts/b2c-intake.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/b2c-intake.schema.json",
  "title": "Independent-driver intake — Phase 09",
  "$defs": {
    "RecipientPhone": {
      "type": "string",
      "pattern": "^(?:\\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$",
      "description": "E.164 or an Egyptian mobile number. The service stores the submitted value and a separate normalized E.164 value."
    },
    "AddressDestination": {
      "type": "object",
      "properties": {
        "kind": { "const": "address" },
        "addressText": { "type": "string", "minLength": 1, "maxLength": 500 }
      },
      "required": ["kind", "addressText"],
      "additionalProperties": false
    },
    "ConfirmedPinDestination": {
      "type": "object",
      "properties": {
        "kind": { "const": "confirmed-pin" },
        "coordinates": { "$ref": "./common.schema.json#/$defs/Coordinates" },
        "addressText": { "type": "string", "minLength": 1, "maxLength": 500 }
      },
      "required": ["kind", "coordinates"],
      "additionalProperties": false
    },
    "IndependentDestination": {
      "oneOf": [
        { "$ref": "#/$defs/AddressDestination" },
        { "$ref": "#/$defs/ConfirmedPinDestination" }
      ],
      "description": "Original driver input. Address-only input remains non-executable until P11 confirms a destination."
    },
    "IndependentCollectionAmount": {
      "type": "object",
      "properties": {
        "amountMinor": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
        "currency": { "const": "EGP" },
        "exponent": { "const": 2 }
      },
      "required": ["amountMinor", "currency", "exponent"],
      "additionalProperties": false,
      "description": "Optional simple B2C collection only: positive EGP minor units, no item or fee model."
    },
    "IndependentTaskInput": {
      "type": "object",
      "properties": {
        "recipientName": { "type": "string", "minLength": 1, "maxLength": 200 },
        "recipientPhone": { "$ref": "#/$defs/RecipientPhone" },
        "destination": { "$ref": "#/$defs/IndependentDestination" },
        "collectionAmount": { "$ref": "#/$defs/IndependentCollectionAmount" },
        "instructions": { "type": "string", "minLength": 1, "maxLength": 1000 }
      },
      "required": ["recipientName", "recipientPhone", "destination"],
      "additionalProperties": false
    },
    "CreateIndependentPayload": {
      "$ref": "#/$defs/IndependentTaskInput"
    },
    "ReviseIndependentPayload": {
      "type": "object",
      "properties": {
        "taskId": { "$ref": "./common.schema.json#/$defs/Uuid" },
        "expectedRevision": { "$ref": "./common.schema.json#/$defs/Revision" },
        "recipientName": { "type": "string", "minLength": 1, "maxLength": 200 },
        "recipientPhone": { "$ref": "#/$defs/RecipientPhone" },
        "destination": { "$ref": "#/$defs/IndependentDestination" },
        "collectionAmount": { "$ref": "#/$defs/IndependentCollectionAmount" },
        "instructions": { "type": "string", "minLength": 1, "maxLength": 1000 }
      },
      "required": ["taskId", "expectedRevision", "recipientName", "recipientPhone", "destination"],
      "additionalProperties": false
    },
    "IndependentTask": {
      "type": "object",
      "properties": {
        "taskId": { "$ref": "./common.schema.json#/$defs/Uuid" },
        "revision": { "$ref": "./common.schema.json#/$defs/Revision" },
        "recipientName": { "type": "string", "minLength": 1, "maxLength": 200 },
        "recipientPhone": { "$ref": "#/$defs/RecipientPhone" },
        "destination": { "$ref": "#/$defs/IndependentDestination" },
        "collectionAmount": { "$ref": "#/$defs/IndependentCollectionAmount" },
        "instructions": { "type": "string", "minLength": 1, "maxLength": 1000 },
        "locationReadiness": { "type": "string", "enum": ["needs-resolution", "confirmed"] },
        "executionReady": { "type": "boolean" },
        "editable": { "type": "boolean" },
        "createdAt": { "$ref": "./common.schema.json#/$defs/UtcInstant" },
        "updatedAt": { "$ref": "./common.schema.json#/$defs/UtcInstant" }
      },
      "required": ["taskId", "revision", "recipientName", "recipientPhone", "destination", "locationReadiness", "executionReady", "editable", "createdAt", "updatedAt"],
      "additionalProperties": false,
      "allOf": [
        {
          "if": { "properties": { "locationReadiness": { "const": "needs-resolution" } }, "required": ["locationReadiness"] },
          "then": { "properties": { "executionReady": { "const": false } } }
        },
        {
          "if": { "properties": { "locationReadiness": { "const": "confirmed" } }, "required": ["locationReadiness"] },
          "then": { "properties": { "executionReady": { "const": true } } }
        }
      ]
    },
    "IndependentTaskResponse": { "$ref": "#/$defs/IndependentTask" },
    "IndependentTaskList": {
      "type": "object",
      "properties": {
        "items": { "type": "array", "items": { "$ref": "#/$defs/IndependentTask" }, "maxItems": 50 },
        "nextCursor": { "type": "string", "minLength": 1, "maxLength": 512 }
      },
      "required": ["items"],
      "additionalProperties": false
    },
    "IntakeError": {
      "type": "object",
      "properties": {
        "error": {
          "type": "object",
          "properties": {
            "code": { "type": "string", "minLength": 1, "maxLength": 100 },
            "message": { "type": "string", "minLength": 1, "maxLength": 1000 },
            "fields": { "type": "object", "additionalProperties": { "type": "string", "minLength": 1, "maxLength": 500 } }
          },
          "required": ["code", "message"],
          "additionalProperties": false
        }
      },
      "required": ["error"],
      "additionalProperties": false
    },
    "CreateIndependentCommand": {
      "allOf": [
        { "$ref": "./action-envelope.v1.schema.json" },
        { "type": "object", "properties": { "operationId": { "const": "task.createIndependent" }, "payload": { "$ref": "#/$defs/CreateIndependentPayload" } } }
      ]
    },
    "ReviseIndependentCommand": {
      "allOf": [
        { "$ref": "./action-envelope.v1.schema.json" },
        { "type": "object", "properties": { "operationId": { "const": "task.reviseIndependent" }, "payload": { "$ref": "#/$defs/ReviseIndependentPayload" } } }
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/b2c-intake.schema.json -->

## Original file: contracts/branch-activity.schema.json

SHA-256: `b068d838956b603eb1e071e0c2fde2ad2a7abd7b32e3721262b68cf3e481c59b` · Bytes: 6426.

<!-- SOURCE-BEGIN contracts/branch-activity.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/branch-activity.schema.json",
  "title": "Source branch interruption and resume",
  "$defs": {
    "Interrupt": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "requestId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "claims": {
          "type": "array",
          "minItems": 1,
          "maxItems": 500,
          "items": {
            "type": "object",
            "properties": {
              "itemId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "quantity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000000
              }
            },
            "required": [
              "itemId",
              "quantity"
            ],
            "additionalProperties": false
          }
        },
        "serviceEstimateSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        }
      },
      "required": [
        "roundId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "requestId",
        "claims",
        "serviceEstimateSeconds"
      ],
      "additionalProperties": false
    },
    "Transition": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "segmentId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedBranchRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "segmentId",
        "expectedBranchRevision"
      ],
      "additionalProperties": false
    },
    "Result": {
      "type": "object",
      "properties": {
        "branchActivity": {
          "$ref": "current-activity.schema.json#/$defs/BranchActivity"
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "planId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "branchActivity",
        "activityRevision",
        "planId"
      ],
      "additionalProperties": false
    },
    "Event": {
      "type": "object",
      "properties": {
        "segmentId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "sourceBranchId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "stage": {
          "enum": [
            "heading",
            "arrived",
            "resumed"
          ]
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "time": {
          "$ref": "current-activity.schema.json#/$defs/ActionTime"
        }
      },
      "required": [
        "segmentId",
        "roundId",
        "driverId",
        "sourceBranchId",
        "stage",
        "activityRevision",
        "time"
      ],
      "additionalProperties": false
    },
    "InterruptCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "branch.interruptRound"
            },
            "context": {
              "$ref": "common.schema.json#/$defs/DeviceContext"
            },
            "payload": {
              "$ref": "#/$defs/Interrupt"
            }
          },
          "required": [
            "operationId",
            "context",
            "payload"
          ]
        }
      ]
    },
    "ArrivalCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "branch.recordArrival"
            },
            "context": {
              "$ref": "common.schema.json#/$defs/DeviceContext"
            },
            "payload": {
              "$ref": "#/$defs/Transition"
            }
          },
          "required": [
            "operationId",
            "context",
            "payload"
          ]
        }
      ]
    },
    "ResumeCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "branch.resumeRound"
            },
            "context": {
              "$ref": "common.schema.json#/$defs/DeviceContext"
            },
            "payload": {
              "$ref": "#/$defs/Transition"
            }
          },
          "required": [
            "operationId",
            "context",
            "payload"
          ]
        }
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/branch-activity.schema.json -->

## Original file: contracts/common.schema.json

SHA-256: `2379916f4108d10d8b1176819eaf8f998edb8bc20e951ef73622979a60a3df81` · Bytes: 25877.

<!-- SOURCE-BEGIN contracts/common.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/common.schema.json",
  "title": "Tawsel canonical common definitions",
  "description": "Designed protocol foundation. No business operation implementation is implied.",
  "$defs": {
    "Uuid": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      "description": "Lowercase UUID; field identity and authenticated relationship checks remain distinct."
    },
    "SchemaVersion": {
      "type": "string",
      "pattern": "^[1-9][0-9]*\\.[0-9]+\\.[0-9]+$"
    },
    "Revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "Generation": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "Sequence": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "PieceCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "PositivePieceCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "UtcInstant": {
      "type": "string",
      "format": "date-time",
      "pattern": "Z$",
      "description": "UTC RFC 3339 instant. Does not establish clock accuracy."
    },
    "ExternalId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "OperationId": {
      "type": "string",
      "pattern": "^[a-z][a-zA-Z0-9]*(\\.[a-z][a-zA-Z0-9]*)+$",
      "maxLength": 128
    },
    "SourceReference": {
      "type": "object",
      "properties": {
        "tenantId": {
          "$ref": "#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "#/$defs/Uuid"
        },
        "externalId": {
          "$ref": "#/$defs/ExternalId"
        }
      },
      "required": [
        "tenantId",
        "integrationId",
        "externalId"
      ],
      "additionalProperties": false
    },
    "Money": {
      "type": "object",
      "properties": {
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "exponent": {
          "type": "integer",
          "minimum": 0,
          "maximum": 4
        }
      },
      "required": [
        "amountMinor",
        "currency",
        "exponent"
      ],
      "additionalProperties": false,
      "description": "Nonnegative integer minor units, never a decimal amount or arbitrary underpayment. Currency/exponent must match supported source policy; EGP is exponent 2.",
      "allOf": [
        {
          "if": {
            "properties": {
              "currency": {
                "const": "EGP"
              }
            },
            "required": [
              "currency"
            ]
          },
          "then": {
            "properties": {
              "exponent": {
                "const": 2
              }
            }
          }
        }
      ]
    },
    "Coordinates": {
      "type": "object",
      "properties": {
        "latitude": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        },
        "longitude": {
          "type": "number",
          "minimum": -180,
          "maximum": 180
        }
      },
      "required": [
        "latitude",
        "longitude"
      ],
      "additionalProperties": false
    },
    "ContactSnapshot": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "phone": {
          "type": "string",
          "minLength": 3,
          "maxLength": 32
        },
        "externalCustomerReference": {
          "$ref": "#/$defs/SourceReference"
        }
      },
      "required": [
        "name",
        "phone"
      ],
      "additionalProperties": false
    },
    "LocationSnapshot": {
      "type": "object",
      "anyOf": [
        {
          "properties": {
            "originalAddress": true
          },
          "required": [
            "originalAddress"
          ]
        },
        {
          "properties": {
            "confirmedPin": true
          },
          "required": [
            "confirmedPin"
          ]
        }
      ],
      "properties": {
        "originalAddress": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "confirmedPin": {
          "$ref": "#/$defs/Coordinates"
        },
        "locationRevision": {
          "$ref": "#/$defs/Revision"
        },
        "provenance": {
          "type": "string",
          "enum": [
            "source",
            "driver-confirmed",
            "staff-confirmed"
          ]
        }
      },
      "required": [
        "provenance"
      ],
      "additionalProperties": false
    },
    "TimeWindow": {
      "type": "object",
      "properties": {
        "earliestAt": {
          "$ref": "#/$defs/UtcInstant"
        },
        "latestAt": {
          "$ref": "#/$defs/UtcInstant"
        }
      },
      "required": [
        "earliestAt"
      ],
      "additionalProperties": false
    },
    "DeliveryRequirements": {
      "type": "object",
      "properties": {
        "priority": {
          "type": "string",
          "enum": [
            "ordinary",
            "urgent"
          ]
        },
        "serviceDurationSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        },
        "timeWindow": {
          "$ref": "#/$defs/TimeWindow"
        },
        "instructions": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "DeliverySnapshot": {
      "type": "object",
      "properties": {
        "sourceTaskReference": {
          "$ref": "#/$defs/SourceReference"
        },
        "sourceOrderReference": {
          "$ref": "#/$defs/SourceReference"
        },
        "sourceRevision": {
          "$ref": "#/$defs/Revision"
        },
        "customer": {
          "$ref": "#/$defs/ContactSnapshot"
        },
        "location": {
          "$ref": "#/$defs/LocationSnapshot"
        },
        "requirements": {
          "$ref": "#/$defs/DeliveryRequirements"
        }
      },
      "required": [
        "sourceTaskReference",
        "sourceRevision",
        "customer",
        "location"
      ],
      "additionalProperties": false
    },
    "ResourceContext": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "#/$defs/Uuid"
        },
        "assignmentId": {
          "$ref": "#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "#/$defs/Uuid"
        },
        "tripId": {
          "$ref": "#/$defs/Uuid"
        },
        "planId": {
          "$ref": "#/$defs/Uuid"
        },
        "stopId": {
          "$ref": "#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "#/$defs/Uuid"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "Versions": {
      "type": "object",
      "properties": {
        "sourceRevision": {
          "$ref": "#/$defs/Revision"
        },
        "resourceRevision": {
          "$ref": "#/$defs/Revision"
        },
        "outcomeRevision": {
          "$ref": "#/$defs/Revision"
        },
        "assignmentGeneration": {
          "$ref": "#/$defs/Generation"
        },
        "routeRevision": {
          "$ref": "#/$defs/Revision"
        },
        "deviceGeneration": {
          "$ref": "#/$defs/Generation"
        },
        "snapshotRevision": {
          "$ref": "#/$defs/Revision"
        },
        "locationRevision": {
          "$ref": "#/$defs/Revision"
        },
        "planningInputRevision": {
          "$ref": "#/$defs/Revision"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "ClockEvidence": {
      "type": "object",
      "properties": {
        "quality": {
          "type": "string",
          "enum": [
            "known",
            "uncertain",
            "unknown"
          ]
        },
        "estimatedOffsetMilliseconds": {
          "type": "integer",
          "minimum": -9007199254740991,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "quality"
      ],
      "additionalProperties": false
    },
    "Observation": {
      "type": "object",
      "properties": {
        "observedAt": {
          "anyOf": [
            {
              "$ref": "#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "clock": {
          "$ref": "#/$defs/ClockEvidence"
        }
      },
      "required": [
        "observedAt",
        "clock"
      ],
      "additionalProperties": false
    },
    "DeviceContext": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "device"
        },
        "tenantId": {
          "$ref": "#/$defs/Uuid"
        },
        "accountId": {
          "$ref": "#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "#/$defs/Uuid"
        },
        "deviceGeneration": {
          "$ref": "#/$defs/Generation"
        },
        "deviceSequence": {
          "$ref": "#/$defs/Sequence"
        },
        "snapshotToken": {
          "$ref": "common.schema.json#/$defs/Uuid",
          "description": "P20: opaque token obtained with the confirmed snapshot for a takeover generation. Installation UUID is not authentication; the server binds tenant/account to the session."
        }
      },
      "required": [
        "kind",
        "tenantId",
        "accountId",
        "deviceId",
        "deviceGeneration",
        "deviceSequence"
      ],
      "additionalProperties": false
    },
    "IntegrationContext": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "#/$defs/Uuid"
        },
        "assertedActorId": {
          "$ref": "#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "CommandContext": {
      "oneOf": [
        {
          "$ref": "#/$defs/DeviceContext"
        },
        {
          "$ref": "#/$defs/IntegrationContext"
        }
      ],
      "description": "Body assertions must match authenticated bindings. An asserted actorId is not authentication."
    },
    "EvidenceStatus": {
      "type": "string",
      "enum": [
        "received"
      ]
    },
    "BusinessStatus": {
      "type": "string",
      "enum": [
        "pending",
        "accepted",
        "rejected",
        "review-required"
      ]
    },
    "DeliveryStatus": {
      "type": "string",
      "enum": [
        "pending",
        "sending",
        "received",
        "failed"
      ]
    },
    "ApplicationStatus": {
      "type": "string",
      "enum": [
        "unknown",
        "pending",
        "applied",
        "failed"
      ]
    },
    "ErrorCode": {
      "type": "string",
      "enum": [
        "wrong_source_branch",
        "quantity_exceeded",
        "validation_failed",
        "idempotency_conflict",
        "capacity_exceeded",
        "invalid_pin",
        "unauthorized",
        "forbidden_resource",
        "lifecycle_forbidden",
        "departed_edit_forbidden",
        "stale_revision",
        "stale_device",
        "unsupported_price_allocation",
        "dependency_missing",
        "dependency_unavailable",
        "unassigned_route",
        "result_unknown",
        "unsupported_schema_version",
        "replay_expired",
        "correction_dependency_conflict",
        "sync_required",
        "sync_incomplete",
        "plan_not_startable",
        "round_already_active"
      ]
    },
    "Problem": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "format": "uri"
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "status": {
          "type": "integer",
          "minimum": 400,
          "maximum": 599
        },
        "code": {
          "$ref": "#/$defs/ErrorCode"
        },
        "correlationId": {
          "$ref": "#/$defs/Uuid"
        },
        "actionId": {
          "$ref": "#/$defs/Uuid"
        },
        "detail": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "retryable": {
          "type": "boolean"
        }
      },
      "required": [
        "type",
        "title",
        "status",
        "code",
        "correlationId",
        "retryable"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "code": {
                "const": "validation_failed"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 400
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "idempotency_conflict"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "capacity_exceeded"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "invalid_pin"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 422
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "unauthorized"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 401
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "forbidden_resource"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 403
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "departed_edit_forbidden"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "stale_revision"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "stale_device"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "unsupported_price_allocation"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 422
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "dependency_missing"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "dependency_unavailable"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 503
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "unassigned_route"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 422
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "result_unknown"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 503
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "unsupported_schema_version"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 422
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "replay_expired"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 410
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "code": {
                "const": "correction_dependency_conflict"
              }
            },
            "required": [
              "code"
            ]
          },
          "then": {
            "properties": {
              "status": {
                "const": 409
              }
            }
          }
        }
      ]
    },
    "Capability": {
      "type": "string",
      "enum": [
        "monitor.read",
        "planning.manage",
        "location.review",
        "execution.own",
        "correction.own",
        "reports.read",
        "reports.export",
        "intake.prepare",
        "assignment.manage",
        "return.receive",
        "return.dispose",
        "identity.provision",
        "integration.manage",
        "diagnostics.read"
      ]
    },
    "CapabilityEffect": {
      "type": "string",
      "enum": [
        "inherit",
        "allow",
        "deny"
      ],
      "description": "Explicit user choice overrides the role; inherit (or no exception row) follows the current role value. Missing role grants deny. Applies equally across assigned branches."
    },
    "CapabilityOverride": {
      "type": "object",
      "properties": {
        "capability": {
          "$ref": "#/$defs/Capability"
        },
        "effect": {
          "$ref": "#/$defs/CapabilityEffect"
        }
      },
      "required": [
        "capability",
        "effect"
      ],
      "additionalProperties": false,
      "description": "Company-user override vocabulary; ERP provisioning endpoint remains P08. This object cannot grant access by appearing in a request."
    },
    "AccessContext": {
      "type": "object",
      "description": "Server-resolved access snapshot, implemented internally in P06; session.getContext HTTP remains P07. Source is the stable account or integration UUID. Display guidance only: recheck current permissions, resource scope and lifecycle for every read/write/job/export. No role name conveys authority.",
      "properties": {
        "tenantId": {
          "$ref": "#/$defs/Uuid"
        },
        "tenantKind": {
          "type": "string",
          "enum": [
            "company",
            "personal"
          ]
        },
        "principalKind": {
          "type": "string",
          "enum": [
            "account",
            "integration"
          ]
        },
        "sourceId": {
          "$ref": "#/$defs/Uuid"
        },
        "branchIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Uuid"
          },
          "uniqueItems": true
        },
        "driverId": {
          "anyOf": [
            {
              "$ref": "#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "effectiveCapabilities": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Capability"
          },
          "uniqueItems": true
        }
      },
      "required": [
        "tenantId",
        "tenantKind",
        "principalKind",
        "sourceId",
        "branchIds",
        "driverId",
        "effectiveCapabilities"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "tenantKind": {
                "const": "personal"
              }
            },
            "required": [
              "tenantKind"
            ]
          },
          "then": {
            "properties": {
              "principalKind": {
                "const": "account"
              },
              "branchIds": {
                "type": "array",
                "maxItems": 0
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "principalKind": {
                "const": "integration"
              }
            },
            "required": [
              "principalKind"
            ]
          },
          "then": {
            "properties": {
              "tenantKind": {
                "const": "company"
              },
              "driverId": {
                "type": "null"
              },
              "effectiveCapabilities": {
                "type": "array",
                "items": {
                  "not": {
                    "enum": [
                      "execution.own",
                      "correction.own"
                    ]
                  }
                }
              }
            }
          }
        }
      ]
    },
    "PageRequest": {
      "type": "object",
      "properties": {
        "cursor": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "PageInfo": {
      "type": "object",
      "properties": {
        "nextCursor": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 2048
            },
            {
              "type": "null"
            }
          ]
        },
        "snapshotRevision": {
          "$ref": "#/$defs/Revision"
        }
      },
      "required": [
        "nextCursor",
        "snapshotRevision"
      ],
      "additionalProperties": false
    },
    "PieceBalance": {
      "type": "object",
      "properties": {
        "sourceQuantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        },
        "delivered": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "held": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "received": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "lost": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "damaged": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        }
      },
      "required": [
        "sourceQuantity",
        "delivered",
        "held",
        "received",
        "lost",
        "damaged"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/common.schema.json -->

## Original file: contracts/consumer.schema.json

SHA-256: `cbff563ea8ea28a6af9f557e85bab0097c89a095d2cb6ca74e3d066d26352fe1` · Bytes: 12793.

<!-- SOURCE-BEGIN contracts/consumer.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/consumer.schema.json",
  "title": "P26 external receipt, projection and reconciliation",
  "$defs": {
    "Aggregate": {
      "type": "object",
      "properties": {
        "type": {
          "enum": [
            "task",
            "assignment",
            "trip",
            "workday",
            "return-request",
            "integration"
          ]
        },
        "id": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "type",
        "id"
      ],
      "additionalProperties": false
    },
    "State": {
      "type": "object",
      "properties": {
        "task": {
          "anyOf": [
            {
              "$ref": "./b2b-intake.schema.json#/$defs/Task"
            },
            {
              "type": "null"
            }
          ]
        },
        "outcomes": {
          "type": "array",
          "maxItems": 1000,
          "items": {
            "$ref": "./outcomes.schema.json#/$defs/Record"
          }
        },
        "returnRequest": {
          "anyOf": [
            {
              "$ref": "./returns.schema.json#/$defs/RequestView"
            },
            {
              "type": "null"
            }
          ]
        },
        "returnItems": {
          "type": "array",
          "maxItems": 1000,
          "items": {
            "type": "object",
            "properties": {
              "itemId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "taskId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "sourceLineId": {
                "$ref": "./common.schema.json#/$defs/ExternalId"
              },
              "requested": {
                "$ref": "./common.schema.json#/$defs/PieceCount"
              },
              "received": {
                "$ref": "./common.schema.json#/$defs/PieceCount"
              },
              "lost": {
                "$ref": "./common.schema.json#/$defs/PieceCount"
              },
              "damaged": {
                "$ref": "./common.schema.json#/$defs/PieceCount"
              },
              "unresolved": {
                "$ref": "./common.schema.json#/$defs/PieceCount"
              }
            },
            "required": [
              "itemId",
              "taskId",
              "sourceLineId",
              "requested",
              "received",
              "lost",
              "damaged",
              "unresolved"
            ],
            "additionalProperties": false
          }
        },
        "notices": {
          "type": "array",
          "maxItems": 1000,
          "items": {
            "type": "object",
            "properties": {
              "key": {
                "type": "string",
                "maxLength": 256
              },
              "event": {
                "$ref": "./events/sender-event.v1.schema.json"
              }
            },
            "required": [
              "key",
              "event"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "task",
        "outcomes",
        "returnRequest",
        "returnItems",
        "notices"
      ],
      "additionalProperties": false
    },
    "Checkpoint": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "recipientIntegrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "aggregate": {
          "type": "object",
          "properties": {
            "type": {
              "enum": [
                "task",
                "assignment",
                "trip",
                "workday",
                "return-request",
                "integration"
              ]
            },
            "id": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "type",
            "id"
          ],
          "additionalProperties": false
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "receivedThrough": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "receivedHigh": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "appliedThrough": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "projectedThrough": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "snapshotThrough": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "historyComplete": {
          "type": "boolean"
        },
        "pendingCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "receivedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "appliedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "lastError": {
          "anyOf": [
            {
              "enum": [
                "sequence_gap",
                "dependency_missing",
                "projection_failed",
                "projection_limit",
                "history_unavailable"
              ]
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "schemaVersion",
        "tenantId",
        "recipientIntegrationId",
        "aggregate",
        "revision",
        "receivedThrough",
        "receivedHigh",
        "appliedThrough",
        "projectedThrough",
        "snapshotThrough",
        "historyComplete",
        "pendingCount",
        "receivedAt",
        "appliedAt",
        "lastError"
      ],
      "additionalProperties": false
    },
    "Status": {
      "type": "object",
      "properties": {
        "checkpoint": {
          "$ref": "#/$defs/Checkpoint"
        },
        "state": {
          "anyOf": [
            {
              "$ref": "#/$defs/State"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "checkpoint",
        "state"
      ],
      "additionalProperties": false
    },
    "Snapshot": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "recipientIntegrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "aggregate": {
          "type": "object",
          "properties": {
            "type": {
              "enum": [
                "task",
                "assignment",
                "trip",
                "workday",
                "return-request",
                "integration"
              ]
            },
            "id": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "type",
            "id"
          ],
          "additionalProperties": false
        },
        "throughSequence": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "capturedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "state": {
          "$ref": "#/$defs/State"
        },
        "history": {
          "const": "current-state-only"
        },
        "retention": {
          "const": "indefinite-no-purge"
        }
      },
      "required": [
        "schemaVersion",
        "tenantId",
        "recipientIntegrationId",
        "aggregate",
        "throughSequence",
        "capturedAt",
        "state",
        "history",
        "retention"
      ],
      "additionalProperties": false
    },
    "ReportCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.reportAppliedCheckpoint"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Checkpoint"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "Report": {
      "type": "object",
      "properties": {
        "checkpoint": {
          "$ref": "#/$defs/Checkpoint"
        },
        "reportedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "evidence": {
          "const": "receiver-reported"
        }
      },
      "required": [
        "checkpoint",
        "reportedAt",
        "evidence"
      ],
      "additionalProperties": false
    },
    "ReportRead": {
      "type": "object",
      "properties": {
        "report": {
          "anyOf": [
            {
              "$ref": "#/$defs/Report"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "report"
      ],
      "additionalProperties": false
    },
    "Problem": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "format": "uri"
        },
        "title": {
          "type": "string"
        },
        "status": {
          "type": "integer",
          "minimum": 400,
          "maximum": 599
        },
        "code": {
          "type": "string",
          "enum": [
            "unsupported_event",
            "event_identity_mismatch",
            "payload_mismatch",
            "sequence_collision",
            "invalid_signature",
            "invalid_json",
            "unauthenticated",
            "stream_unavailable",
            "invalid_query",
            "receiver_unavailable"
          ]
        },
        "correlationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "retryable": {
          "type": "boolean"
        }
      },
      "required": [
        "type",
        "title",
        "status",
        "code",
        "correlationId",
        "retryable"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/consumer.schema.json -->

## Original file: contracts/corrections.schema.json

SHA-256: `6f44c84bd6adc1a39ee0d3f5c01c27f7d3041523c4295243f8672fbdff91aae6` · Bytes: 10075.

<!-- SOURCE-BEGIN contracts/corrections.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/corrections.schema.json",
  "title": "Bounded driver report corrections v1",
  "description": "Append an effective report revision. Monetary values are corrected reported facts, never refund or settlement instructions. Source prices are immutable; no staff execution override. Received/disposed/redispatched pieces and closed days cannot be undone. Adoption reuses retained original payload with current validation.",
  "$defs": {
    "Replacement": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "outcome": {
              "const": "full"
            },
            "reportedCollection": {
              "$ref": "outcomes.schema.json#/$defs/Money"
            }
          },
          "required": [
            "outcome"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "outcome": {
              "const": "partial"
            },
            "pieces": {
              "type": "array",
              "items": {
                "$ref": "outcomes.schema.json#/$defs/Piece"
              },
              "minItems": 1,
              "maxItems": 100
            },
            "reportedCollection": {
              "$ref": "outcomes.schema.json#/$defs/Money"
            }
          },
          "required": [
            "outcome",
            "pieces",
            "reportedCollection"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "outcome": {
              "const": "refused"
            },
            "reportedCollection": {
              "$ref": "outcomes.schema.json#/$defs/Money"
            },
            "shippingPayment": {
              "enum": [
                "collected",
                "refused"
              ]
            }
          },
          "required": [
            "outcome"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "outcome": {
              "const": "no-answer"
            }
          },
          "required": [
            "outcome"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Correct": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedOutcomeRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "replacement": {
          "$ref": "#/$defs/Replacement"
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedOutcomeRevision",
        "replacement"
      ],
      "additionalProperties": false
    },
    "CorrectCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "outcome.correct"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            },
            "payload": {
              "$ref": "#/$defs/Correct"
            }
          }
        }
      ]
    },
    "Constraint": {
      "enum": [
        "closed-workday",
        "dependent-receipt",
        "dependent-redispatch",
        "changed-assignment",
        "changed-source",
        "changed-attempt",
        "not-current-owner",
        "correction-not-authorized",
        "outcome-required",
        "claimed-handover"
      ]
    },
    "Availability": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "effectiveOutcomeRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "effectiveOutcome": {
          "anyOf": [
            {
              "$ref": "outcomes.schema.json#/$defs/Record"
            },
            {
              "type": "null"
            }
          ]
        },
        "allowed": {
          "type": "boolean"
        },
        "constraints": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/Constraint"
          }
        },
        "nextSteps": {
          "type": "array",
          "items": {
            "enum": [
              "refresh-state",
              "view-history",
              "erp-commercial-review"
            ]
          }
        },
        "message": {
          "type": "string",
          "minLength": 1
        },
        "delivery": {
          "$ref": "current-activity.schema.json#/$defs/DeliveryAffordance",
          "description": "Frozen replacement choices and exact amounts excluding this attempt from prior collections. Choices do not override availability.allowed."
        },
        "originalOutcome": {
          "anyOf": [
            {
              "$ref": "outcomes.schema.json#/$defs/Record"
            },
            {
              "type": "null"
            }
          ],
          "description": "First recorded result for this attempt; effectiveOutcome retains the latest correction."
        },
        "executionRoundId": {
          "$ref": "common.schema.json#/$defs/Uuid",
          "description": "Latest round anchoring current device ownership, generation and snapshot token; roundId remains the original outcome round."
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "effectiveOutcomeRevision",
        "effectiveOutcome",
        "allowed",
        "constraints",
        "nextSteps",
        "message"
      ],
      "additionalProperties": false
    },
    "Record": {
      "type": "object",
      "properties": {
        "correctionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "previousOutcomeId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "previousRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "outcome": {
          "$ref": "outcomes.schema.json#/$defs/Record"
        },
        "evidenceActionId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "evidenceReceiptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "correctionId",
        "previousOutcomeId",
        "previousRevision",
        "outcome",
        "evidenceActionId",
        "evidenceReceiptId"
      ],
      "additionalProperties": false
    },
    "Result": {
      "type": "object",
      "properties": {
        "correction": {
          "$ref": "#/$defs/Record"
        }
      },
      "required": [
        "correction"
      ],
      "additionalProperties": false
    },
    "Event": {
      "type": "object",
      "properties": {
        "correction": {
          "$ref": "#/$defs/Record"
        },
        "previousOutcome": {
          "anyOf": [
            {
              "$ref": "outcomes.schema.json#/$defs/Record"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "correction",
        "previousOutcome"
      ],
      "additionalProperties": false
    },
    "AdoptionEvent": {
      "type": "object",
      "properties": {
        "evidenceActionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "evidenceReceiptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "correctionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "outcomeId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "outcomeRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "evidenceActionId",
        "evidenceReceiptId",
        "correctionId",
        "outcomeId",
        "outcomeRevision"
      ],
      "additionalProperties": false
    },
    "ActionResult": {
      "$ref": "action-result.v1.schema.json"
    },
    "ActionStatus": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "pending",
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/ActionResult"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/corrections.schema.json -->

## Original file: contracts/current-activity.schema.json

SHA-256: `7a471aaa12d404c886b4baa33061f0fe8fd908395c8c083bd602c77543444fa4` · Bytes: 28600.

<!-- SOURCE-BEGIN contracts/current-activity.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/current-activity.schema.json",
  "title": "Explicit current activity and physical origin",
  "$defs": {
    "ActionTime": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "recordedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "observation": {
          "$ref": "common.schema.json#/$defs/Observation"
        }
      },
      "required": [
        "actionId",
        "recordedAt",
        "observation"
      ],
      "additionalProperties": false,
      "description": "recordedAt is server acceptance recording time, not measured travel time. observation preserves the device report, including missing/uncertain clock evidence, without promoting it to server truth."
    },
    "Activity": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "stage": {
          "enum": [
            "heading",
            "arrived"
          ]
        },
        "heading": {
          "$ref": "#/$defs/ActionTime"
        },
        "arrival": {
          "anyOf": [
            {
              "$ref": "#/$defs/ActionTime"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "revision",
        "stage",
        "heading",
        "arrival"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "stage": {
                "const": "arrived"
              }
            },
            "required": [
              "stage"
            ]
          },
          "then": {
            "properties": {
              "arrival": {
                "$ref": "#/$defs/ActionTime"
              }
            }
          },
          "else": {
            "properties": {
              "arrival": {
                "type": "null"
              }
            }
          }
        }
      ]
    },
    "PhysicalOrigin": {
      "type": "object",
      "properties": {
        "kind": {
          "enum": [
            "last-confirmed-stop",
            "manual-pin",
            "branch-pin"
          ]
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "attemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "time": {
          "$ref": "#/$defs/ActionTime"
        }
      },
      "required": [
        "kind",
        "coordinates",
        "revision",
        "roundId",
        "taskId",
        "attemptId",
        "time"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "kind": {
                "const": "last-confirmed-stop"
              }
            },
            "required": [
              "kind"
            ]
          },
          "then": {
            "properties": {
              "taskId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "attemptId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              }
            }
          },
          "else": {
            "properties": {
              "taskId": {
                "type": "null"
              },
              "attemptId": {
                "type": "null"
              }
            }
          }
        }
      ]
    },
    "Target": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        "recipientName": {
          "type": "string"
        },
        "recipientPhone": {
          "type": "string"
        },
        "address": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "delivery": {
          "$ref": "#/$defs/DeliveryAffordance"
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "coordinates",
        "recipientName",
        "recipientPhone",
        "address",
        "delivery"
      ],
      "additionalProperties": false
    },
    "DeliveryAffordance": {
      "type": "object",
      "properties": {
        "kind": {
          "enum": [
            "personal",
            "company"
          ]
        },
        "allowedActions": {
          "type": "array",
          "minItems": 2,
          "uniqueItems": true,
          "items": {
            "enum": [
              "full",
              "partial",
              "refusal",
              "no-answer"
            ]
          }
        },
        "fullCollection": {
          "anyOf": [
            {
              "$ref": "#/$defs/DeliveryMoney"
            },
            {
              "type": "null"
            }
          ],
          "description": "Exact server-calculated amount to report for a full result. Null means the personal task has no collection."
        },
        "goodsDue": {
          "anyOf": [
            {
              "$ref": "#/$defs/DeliveryMoney"
            },
            {
              "type": "null"
            }
          ]
        },
        "shippingDue": {
          "anyOf": [
            {
              "$ref": "#/$defs/DeliveryMoney"
            },
            {
              "type": "null"
            }
          ]
        },
        "lines": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "type": "object",
            "properties": {
              "sourceLineId": {
                "$ref": "common.schema.json#/$defs/ExternalId"
              },
              "description": {
                "type": "string"
              },
              "quantity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000000
              },
              "unitDue": {
                "$ref": "#/$defs/DeliveryMoney"
              }
            },
            "required": [
              "sourceLineId",
              "description",
              "quantity",
              "unitDue"
            ],
            "additionalProperties": false
          },
          "description": "Frozen source allocation for exact whole-piece selection; empty for personal tasks. Optional for compatibility with older readers."
        }
      },
      "required": [
        "kind",
        "allowedActions",
        "fullCollection",
        "goodsDue",
        "shippingDue"
      ],
      "additionalProperties": false
    },
    "DeliveryMoney": {
      "type": "object",
      "properties": {
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currency": {
          "const": "EGP"
        },
        "exponent": {
          "const": 2
        }
      },
      "required": [
        "amountMinor",
        "currency",
        "exponent"
      ],
      "additionalProperties": false
    },
    "SelectHeading": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision"
      ],
      "additionalProperties": false,
      "description": "Selection itself explicitly begins heading. Compare activity revision and previous attempt; replacing heading pauses its attempt with history. Arrived work must be resolved first. Same task/attempt keeps its identity. Route revision is deliberately not a command dependency."
    },
    "Arrival": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision"
      ],
      "additionalProperties": false
    },
    "CorrectOrigin": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedOriginRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        }
      },
      "required": [
        "roundId",
        "expectedOriginRevision",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "Snapshot": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "owner": {
          "type": "object",
          "properties": {
            "accountId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "deviceId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "generation": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "accountId",
            "deviceId",
            "generation"
          ],
          "additionalProperties": false
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currentActivity": {
          "anyOf": [
            {
              "$ref": "#/$defs/Activity"
            },
            {
              "type": "null"
            }
          ]
        },
        "physicalOrigin": {
          "anyOf": [
            {
              "$ref": "#/$defs/PhysicalOrigin"
            },
            {
              "type": "null"
            }
          ]
        },
        "planningOrigin": {
          "$ref": "routing.schema.json#/$defs/Origin"
        },
        "nextSuggestion": {
          "anyOf": [
            {
              "$ref": "#/$defs/Target"
            },
            {
              "type": "null"
            }
          ]
        },
        "planning": {
          "type": "object",
          "properties": {
            "planId": {
              "anyOf": [
                {
                  "$ref": "common.schema.json#/$defs/Uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "updating": {
              "type": "boolean"
            }
          },
          "required": [
            "planId",
            "updating"
          ],
          "additionalProperties": false
        },
        "targets": {
          "type": "array",
          "maxItems": 50,
          "items": {
            "$ref": "#/$defs/Target"
          }
        },
        "branchActivity": {
          "anyOf": [
            {
              "$ref": "#/$defs/BranchActivity"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "roundId",
        "driverId",
        "owner",
        "revision",
        "currentActivity",
        "physicalOrigin",
        "planningOrigin",
        "nextSuggestion",
        "planning",
        "targets"
      ],
      "additionalProperties": false,
      "description": "Coherent authorized round read; current is explicit, nextSuggestion is only the first other eligible member of a retained valid plan. May be null while planning. targets contains only currently eligible admitted work. Physical origin is recorded evidence; initial planning origin is not arrival."
    },
    "CommandResult": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currentActivity": {
          "anyOf": [
            {
              "$ref": "#/$defs/Activity"
            },
            {
              "type": "null"
            }
          ]
        },
        "physicalOrigin": {
          "anyOf": [
            {
              "$ref": "#/$defs/PhysicalOrigin"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "roundId",
        "revision",
        "currentActivity",
        "physicalOrigin"
      ],
      "additionalProperties": false
    },
    "SelectHeadingCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "current.selectHeading"
            },
            "payload": {
              "$ref": "#/$defs/SelectHeading"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          }
        }
      ]
    },
    "ArrivalCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "current.recordArrival"
            },
            "payload": {
              "$ref": "#/$defs/Arrival"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          }
        }
      ]
    },
    "CorrectOriginCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "current.correctOrigin"
            },
            "payload": {
              "$ref": "#/$defs/CorrectOrigin"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          }
        }
      ]
    },
    "ActionResult": {
      "allOf": [
        {
          "$ref": "action-result.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "enum": [
                "current.selectHeading",
                "current.recordArrival",
                "current.correctOrigin"
              ]
            }
          },
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "accepted"
                      }
                    },
                    "required": [
                      "businessStatus"
                    ]
                  }
                },
                "required": [
                  "receipt"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "response": {
                    "type": "object",
                    "properties": {
                      "body": {
                        "$ref": "#/$defs/CommandResult"
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    },
    "ActionStatus": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "pending"
            }
          },
          "required": [
            "actionId",
            "status"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            },
            "result": {
              "$ref": "#/$defs/ActionResult"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Event": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "stage": {
          "enum": [
            "heading",
            "arrived",
            "paused"
          ]
        },
        "time": {
          "$ref": "#/$defs/ActionTime"
        }
      },
      "required": [
        "roundId",
        "driverId",
        "taskId",
        "attemptId",
        "activityRevision",
        "stage",
        "time"
      ],
      "additionalProperties": false
    },
    "HeadingEvent": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "stage": {
          "enum": [
            "heading",
            "paused"
          ]
        },
        "time": {
          "$ref": "#/$defs/ActionTime"
        }
      },
      "required": [
        "roundId",
        "driverId",
        "taskId",
        "attemptId",
        "activityRevision",
        "stage",
        "time"
      ],
      "additionalProperties": false
    },
    "ArrivalEvent": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "stage": {
          "const": "arrived"
        },
        "time": {
          "$ref": "#/$defs/ActionTime"
        }
      },
      "required": [
        "roundId",
        "driverId",
        "taskId",
        "attemptId",
        "activityRevision",
        "stage",
        "time"
      ],
      "additionalProperties": false
    },
    "BranchActivity": {
      "type": "object",
      "properties": {
        "segmentId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "requestId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "sourceBranchId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "stage": {
          "enum": [
            "heading",
            "arrived",
            "resumed"
          ]
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        "serviceEstimateSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        },
        "claims": {
          "type": "array",
          "minItems": 1,
          "maxItems": 500,
          "items": {
            "type": "object",
            "properties": {
              "itemId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "quantity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000000
              }
            },
            "required": [
              "itemId",
              "quantity"
            ],
            "additionalProperties": false
          }
        },
        "retainedPlanId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "retainedSequence": {
          "type": "array",
          "maxItems": 50,
          "items": {
            "type": "object",
            "properties": {
              "taskId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "attemptId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              }
            },
            "required": [
              "taskId",
              "attemptId"
            ],
            "additionalProperties": false
          }
        },
        "pausedActivity": {
          "anyOf": [
            {
              "$ref": "#/$defs/Activity"
            },
            {
              "type": "null"
            }
          ]
        },
        "heading": {
          "$ref": "#/$defs/ActionTime"
        },
        "arrival": {
          "anyOf": [
            {
              "$ref": "#/$defs/ActionTime"
            },
            {
              "type": "null"
            }
          ]
        },
        "resumed": {
          "anyOf": [
            {
              "$ref": "#/$defs/ActionTime"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "segmentId",
        "roundId",
        "requestId",
        "sourceBranchId",
        "revision",
        "stage",
        "coordinates",
        "serviceEstimateSeconds",
        "claims",
        "retainedPlanId",
        "retainedSequence",
        "pausedActivity",
        "heading",
        "arrival",
        "resumed"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "stage": {
                "enum": [
                  "arrived",
                  "resumed"
                ]
              }
            },
            "required": [
              "stage"
            ]
          },
          "then": {
            "properties": {
              "arrival": {
                "$ref": "#/$defs/ActionTime"
              }
            }
          },
          "else": {
            "properties": {
              "arrival": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "stage": {
                "const": "resumed"
              }
            },
            "required": [
              "stage"
            ]
          },
          "then": {
            "properties": {
              "resumed": {
                "$ref": "#/$defs/ActionTime"
              }
            }
          },
          "else": {
            "properties": {
              "resumed": {
                "type": "null"
              }
            }
          }
        }
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/current-activity.schema.json -->

## Original file: contracts/device-ownership.schema.json

SHA-256: `4fadce037f2cae24b52cd35697623339a5d70ce85244312ff26af97c50cd42f3` · Bytes: 15132.

<!-- SOURCE-BEGIN contracts/device-ownership.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/device-ownership.schema.json",
  "title": "Online same-driver takeover and preserved evidence v1",
  "$defs": {
    "Takeover": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedGeneration": {
          "$ref": "common.schema.json#/$defs/Generation"
        }
      },
      "required": [
        "roundId",
        "expectedGeneration"
      ],
      "additionalProperties": false
    },
    "TakeoverCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "device.takeOver"
            },
            "payload": {
              "$ref": "#/$defs/Takeover"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          }
        }
      ]
    },
    "TakeoverResult": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "owner": {
          "type": "object",
          "properties": {
            "accountId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "deviceId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "generation": {
              "$ref": "common.schema.json#/$defs/Generation"
            }
          },
          "required": [
            "accountId",
            "deviceId",
            "generation"
          ],
          "additionalProperties": false
        },
        "snapshotRequired": {
          "const": true
        }
      },
      "required": [
        "roundId",
        "workdayId",
        "driverId",
        "owner",
        "snapshotRequired"
      ],
      "additionalProperties": false
    },
    "Context": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "owner": {
          "type": "object",
          "properties": {
            "accountId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "deviceId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "generation": {
              "$ref": "common.schema.json#/$defs/Generation"
            }
          },
          "required": [
            "accountId",
            "deviceId",
            "generation"
          ],
          "additionalProperties": false
        },
        "viewerDeviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "mode": {
          "enum": [
            "owner",
            "view-only"
          ]
        },
        "roundState": {
          "enum": [
            "active",
            "ended"
          ]
        },
        "workdayState": {
          "enum": [
            "open",
            "closed"
          ]
        },
        "mayTakeover": {
          "type": "boolean"
        },
        "snapshotRequired": {
          "type": "boolean"
        }
      },
      "required": [
        "roundId",
        "workdayId",
        "driverId",
        "owner",
        "viewerDeviceId",
        "mode",
        "roundState",
        "workdayState",
        "mayTakeover",
        "snapshotRequired"
      ],
      "additionalProperties": false
    },
    "Snapshot": {
      "type": "object",
      "properties": {
        "context": {
          "$ref": "#/$defs/Context"
        },
        "confirmedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "current": {
          "anyOf": [
            {
              "$ref": "current-activity.schema.json#/$defs/Snapshot"
            },
            {
              "type": "null"
            }
          ]
        },
        "snapshotToken": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "context",
        "confirmedAt",
        "current",
        "snapshotToken"
      ],
      "additionalProperties": false
    },
    "ActionStatus": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "pending"
            }
          },
          "required": [
            "actionId",
            "status"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            },
            "result": {
              "$ref": "action-result.v1.schema.json"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        }
      ]
    },
    "FormerSubmission": {
      "description": "Submit the ORIGINAL immutable execution envelope and action ID. This evidence-only endpoint never executes it, including when it is still owned. Exact duplicate returns the original business result. Not a second wrapper action.",
      "oneOf": [
        {
          "$ref": "current-activity.schema.json#/$defs/SelectHeadingCommand"
        },
        {
          "$ref": "current-activity.schema.json#/$defs/ArrivalCommand"
        },
        {
          "$ref": "current-activity.schema.json#/$defs/CorrectOriginCommand"
        },
        {
          "$ref": "outcomes.schema.json#/$defs/FullCommand"
        },
        {
          "$ref": "outcomes.schema.json#/$defs/PartialCommand"
        },
        {
          "$ref": "outcomes.schema.json#/$defs/RefusalCommand"
        },
        {
          "$ref": "outcomes.schema.json#/$defs/NoAnswerCommand"
        },
        {
          "$ref": "eligibility.schema.json#/$defs/DeferCommand"
        },
        {
          "$ref": "eligibility.schema.json#/$defs/RetryCommand"
        },
        {
          "$ref": "eligibility.schema.json#/$defs/ActivateCommand"
        },
        {
          "$ref": "eligibility.schema.json#/$defs/UrgencyCommand"
        },
        {
          "$ref": "workday-closure.schema.json#/$defs/EndRoundCommand"
        },
        {
          "$ref": "workday-closure.schema.json#/$defs/EndDayCommand"
        }
      ]
    },
    "EvidenceSubmissionResult": {
      "type": "object",
      "properties": {
        "submissionStatus": {
          "enum": [
            "received",
            "duplicate"
          ]
        },
        "result": {
          "$ref": "action-result.v1.schema.json"
        }
      },
      "required": [
        "submissionStatus",
        "result"
      ],
      "additionalProperties": false
    },
    "Recovery": {
      "type": "object",
      "properties": {
        "adoptionImplemented": {
          "const": true
        },
        "state": {
          "enum": [
            "blocked",
            "requires-validation"
          ]
        },
        "constraints": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "enum": [
              "closed-workday",
              "dependent-receipt",
              "changed-assignment",
              "changed-source",
              "changed-attempt",
              "not-current-owner",
              "correction-not-authorized",
              "unsupported-operation",
              "dependent-redispatch",
              "unknown-generation",
              "changed-pin",
              "already-adopted",
              "ended-round",
              "claimed-handover",
              "unresolved-dependency"
            ]
          }
        },
        "currentGeneration": {
          "$ref": "common.schema.json#/$defs/Generation"
        },
        "effectiveOutcomeRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "adoptedOutcomeId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "adoptionImplemented",
        "state",
        "constraints",
        "currentGeneration",
        "effectiveOutcomeRevision",
        "activityRevision",
        "adoptedOutcomeId"
      ],
      "additionalProperties": false
    },
    "Evidence": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "result": {
          "$ref": "action-result.v1.schema.json"
        },
        "envelope": {
          "anyOf": [
            {
              "$ref": "action-envelope.v1.schema.json"
            },
            {
              "type": "null"
            }
          ]
        },
        "durableReceipt": {
          "const": true
        },
        "recovery": {
          "$ref": "#/$defs/Recovery"
        },
        "taskLabel": {
          "type": "string",
          "description": "Authorized admitted task recipient label for human review; absent for non-task evidence."
        }
      },
      "required": [
        "actionId",
        "result",
        "envelope",
        "durableReceipt",
        "recovery"
      ],
      "additionalProperties": false
    },
    "Adoption": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "evidenceActionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "evidenceReceiptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedGeneration": {
          "$ref": "common.schema.json#/$defs/Generation"
        },
        "expectedOutcomeRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "evidenceActionId",
        "evidenceReceiptId",
        "expectedGeneration",
        "expectedOutcomeRevision",
        "expectedActivityRevision",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision"
      ],
      "additionalProperties": false,
      "description": "P23 implemented: current assigned owner explicitly adopts a retained delivery outcome with the original receipt and unchanged source/assignment/pin. Expected revisions and current generation are revalidated. Open original day and no dependent receipt/disposition/redispatch or later attempt. Arrival-only evidence is retained but not adoptable. Client time grants no authority."
    },
    "AdoptionCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "evidence.adoptCompatible"
            },
            "payload": {
              "$ref": "#/$defs/Adoption"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          }
        }
      ]
    },
    "TransferEvent": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "generation": {
          "$ref": "common.schema.json#/$defs/Generation"
        }
      },
      "required": [
        "actionId",
        "roundId",
        "driverId",
        "generation"
      ],
      "additionalProperties": false,
      "description": "Durable account-recipient notification intent; no shipment transfer, device secret or ERP business mutation. Transport is P25."
    },
    "EvidenceEvent": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "businessStatus": {
          "enum": [
            "rejected",
            "review-required"
          ]
        },
        "code": {
          "$ref": "common.schema.json#/$defs/Problem/properties/code"
        }
      },
      "required": [
        "actionId",
        "roundId",
        "driverId",
        "businessStatus",
        "code"
      ],
      "additionalProperties": false,
      "description": "Durable submitting-account notification after rejected domain writes roll back. Query the scoped original action receipt; never imply business acceptance. No envelope/contact/money data in the notification."
    }
  }
}

````
<!-- SOURCE-END contracts/device-ownership.schema.json -->

## Original file: contracts/eligibility.schema.json

SHA-256: `15e474f47d2695d6d3794ed38a87750502e6402098494ef0f5a98aa5196ef089` · Bytes: 19515.

<!-- SOURCE-BEGIN contracts/eligibility.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/eligibility.schema.json",
  "title": "Explicit whole-work eligibility and driver urgency v1",
  "$defs": {
    "Defer": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedEligibilityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "earliestAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision",
        "expectedEligibilityRevision",
        "earliestAt"
      ],
      "additionalProperties": false
    },
    "DeferCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "task.deferWhole"
            },
            "payload": {
              "$ref": "#/$defs/Defer"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "Retry": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedEligibilityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision",
        "expectedEligibilityRevision"
      ],
      "additionalProperties": false
    },
    "RetryCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "task.retryWhole"
            },
            "payload": {
              "$ref": "#/$defs/Retry"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "Activate": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedEligibilityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision",
        "expectedEligibilityRevision"
      ],
      "additionalProperties": false
    },
    "ActivateCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "task.activateDeferred"
            },
            "payload": {
              "$ref": "#/$defs/Activate"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "Urgency": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedEligibilityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "urgency": {
          "enum": [
            "ordinary",
            "urgent"
          ]
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision",
        "expectedEligibilityRevision",
        "urgency"
      ],
      "additionalProperties": false
    },
    "UrgencyCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "task.setDriverUrgency"
            },
            "payload": {
              "$ref": "#/$defs/Urgency"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "AllowedAction": {
      "type": "object",
      "properties": {
        "allowed": {
          "type": "boolean"
        },
        "blocker": {
          "anyOf": [
            {
              "enum": [
                "not-held",
                "different-driver",
                "receipt-or-disposition",
                "partial-or-delivered",
                "current-customer",
                "result-required",
                "not-deferred",
                "earliest-time",
                "location-required",
                "capacity",
                "round-closed"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "message": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "allowed",
        "blocker",
        "message"
      ],
      "additionalProperties": false
    },
    "State": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "earliestAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "urgency": {
          "enum": [
            "ordinary",
            "urgent"
          ]
        },
        "deferred": {
          "type": "boolean"
        },
        "latestOutcomeId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "actions": {
          "type": "object",
          "properties": {
            "defer": {
              "$ref": "#/$defs/AllowedAction"
            },
            "retry": {
              "$ref": "#/$defs/AllowedAction"
            },
            "activate": {
              "$ref": "#/$defs/AllowedAction"
            },
            "urgency": {
              "$ref": "#/$defs/AllowedAction"
            }
          },
          "required": [
            "defer",
            "retry",
            "activate",
            "urgency"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "revision",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "earliestAt",
        "urgency",
        "deferred",
        "latestOutcomeId",
        "actions"
      ],
      "additionalProperties": false
    },
    "Record": {
      "type": "object",
      "properties": {
        "operationId": {
          "enum": [
            "task.deferWhole",
            "task.retryWhole",
            "task.activateDeferred",
            "task.setDriverUrgency"
          ]
        },
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "previousAttemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "earliestAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "urgency": {
          "enum": [
            "ordinary",
            "urgent"
          ]
        },
        "deferred": {
          "type": "boolean"
        },
        "time": {
          "$ref": "./current-activity.schema.json#/$defs/ActionTime"
        },
        "sourceReference": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/SourceReference"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceDispatchCycleId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/ExternalId"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "mode": {
          "enum": [
            "active-round",
            "preparation"
          ],
          "description": "Preparation uses the last ended round only as an ownership anchor; it never reopens its execution or workday."
        }
      },
      "required": [
        "operationId",
        "roundId",
        "driverId",
        "taskId",
        "previousAttemptId",
        "attemptId",
        "revision",
        "earliestAt",
        "urgency",
        "deferred",
        "time",
        "sourceReference",
        "sourceDispatchCycleId",
        "sourceRevision",
        "assignmentRevision",
        "dispatchCycleId"
      ],
      "additionalProperties": false
    },
    "CommandResult": {
      "type": "object",
      "properties": {
        "change": {
          "$ref": "#/$defs/Record"
        },
        "state": {
          "$ref": "#/$defs/State"
        }
      },
      "required": [
        "change",
        "state"
      ],
      "additionalProperties": false
    },
    "Event": {
      "type": "object",
      "properties": {
        "change": {
          "$ref": "#/$defs/Record"
        }
      },
      "required": [
        "change"
      ],
      "additionalProperties": false
    },
    "ActionResult": {
      "allOf": [
        {
          "$ref": "action-result.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "enum": [
                "task.deferWhole",
                "task.retryWhole",
                "task.activateDeferred",
                "task.setDriverUrgency"
              ]
            }
          },
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "accepted"
                      }
                    },
                    "required": [
                      "businessStatus"
                    ]
                  }
                },
                "required": [
                  "receipt"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "response": {
                    "type": "object",
                    "properties": {
                      "body": {
                        "$ref": "#/$defs/CommandResult"
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    },
    "ActionStatus": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "pending"
            }
          },
          "required": [
            "actionId",
            "status"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            },
            "result": {
              "$ref": "#/$defs/ActionResult"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Snapshot": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currentAttemptId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/State"
          }
        },
        "history": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Record"
          }
        },
        "mode": {
          "enum": [
            "active-round",
            "preparation",
            "historical"
          ]
        }
      },
      "required": [
        "roundId",
        "activityRevision",
        "currentAttemptId",
        "items",
        "history"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/eligibility.schema.json -->

## Original file: contracts/events/envelope.v1.schema.json

SHA-256: `d723d62d419e5fe20f896481df0d54ef6b94d8437d19f3057cc47f199eba7ccd` · Bytes: 3304.

<!-- SOURCE-BEGIN contracts/events/envelope.v1.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/events/envelope.v1.schema.json",
  "title": "Recipient event envelope v1 — sender implemented; feature catalog defines emitted types",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "payloadVersion": {
      "const": "1.0.0"
    },
    "eventId": {
      "$ref": "../common.schema.json#/$defs/Uuid"
    },
    "eventType": {
      "$ref": "../common.schema.json#/$defs/OperationId"
    },
    "eventKind": {
      "type": "string",
      "enum": [
        "transition",
        "replacement-snapshot"
      ]
    },
    "tenantId": {
      "$ref": "../common.schema.json#/$defs/Uuid"
    },
    "recipientIntegrationId": {
      "$ref": "../common.schema.json#/$defs/Uuid"
    },
    "aggregate": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "task",
            "assignment",
            "trip",
            "workday",
            "return-request",
            "integration"
          ]
        },
        "id": {
          "$ref": "../common.schema.json#/$defs/Uuid"
        },
        "recipientSequence": {
          "$ref": "../common.schema.json#/$defs/Sequence"
        }
      },
      "required": [
        "type",
        "id",
        "recipientSequence"
      ],
      "additionalProperties": false
    },
    "resources": {
      "$ref": "../common.schema.json#/$defs/ResourceContext"
    },
    "versions": {
      "$ref": "../common.schema.json#/$defs/Versions"
    },
    "correlation": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "../common.schema.json#/$defs/Uuid"
        },
        "sourceReference": {
          "$ref": "../common.schema.json#/$defs/SourceReference"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "committedAt": {
      "$ref": "../common.schema.json#/$defs/UtcInstant"
    },
    "snapshotRevision": {
      "$ref": "../common.schema.json#/$defs/Revision"
    },
    "payload": {
      "type": "object",
      "additionalProperties": true,
      "description": "Feature owner supplies event-type/payload-version schema. Envelope acceptance is not business validation."
    }
  },
  "required": [
    "schemaVersion",
    "payloadVersion",
    "eventId",
    "eventType",
    "eventKind",
    "tenantId",
    "recipientIntegrationId",
    "aggregate",
    "resources",
    "versions",
    "correlation",
    "committedAt",
    "payload"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "eventKind": {
            "const": "replacement-snapshot"
          }
        },
        "required": [
          "eventKind"
        ]
      },
      "then": {
        "properties": { "snapshotRevision": true },
        "required": [
          "snapshotRevision"
        ]
      },
      "else": {
        "not": {
          "properties": { "snapshotRevision": true },
          "required": [
            "snapshotRevision"
          ]
        }
      }
    }
  ]
}

````
<!-- SOURCE-END contracts/events/envelope.v1.schema.json -->

## Original file: contracts/events/sender-event.v1.schema.json

SHA-256: `cbce5b5128d8d2f5cf6c58668c989e6b403876531703921a16834dbcf9fb1f06` · Bytes: 14025.

<!-- SOURCE-BEGIN contracts/events/sender-event.v1.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/events/sender-event.v1.schema.json",
  "title": "P25 emitted integration events v1",
  "allOf": [
    {
      "$ref": "./envelope.v1.schema.json"
    }
  ],
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "provisioning.changed"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../provisioning.schema.json#/$defs/ProvisioningChanged"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.snapshotAccepted"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.prepared"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.received"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.withdrawn"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.reassigned"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.urgencyChanged"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "dispatch.createdFromReceipt"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "location.pinConfirmed"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../location.schema.json#/$defs/ConfirmedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "plan.revisionPublished"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../planning.schema.json#/$defs/PublishedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "round.started"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../round-start.schema.json#/$defs/StartedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "current.headingSelected"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../current-activity.schema.json#/$defs/HeadingEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "current.arrivalRecorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../current-activity.schema.json#/$defs/ArrivalEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "outcome.recorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../outcomes.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.deferred"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.retryAdmitted"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.deferredActivated"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.driverUrgencyChanged"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "round.ended"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../workday-closure.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "workday.ended"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../workday-closure.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "return.requested"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../returns.schema.json#/$defs/RequestedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "return.subsetReceived"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../returns.schema.json#/$defs/ReceivedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "return.dispositionRecorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../returns.schema.json#/$defs/DispositionEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "branch.roundInterrupted"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../branch-activity.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "branch.arrivalRecorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../branch-activity.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "branch.roundResumed"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../branch-activity.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "outcome.corrected"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../corrections.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    }
  ]
}

````
<!-- SOURCE-END contracts/events/sender-event.v1.schema.json -->

## Original file: contracts/evidence-receipt.v1.schema.json

SHA-256: `ee3d27729454cb915ff9f01fbac5ebb2d9a5c9ead0b1521357f05fb6cef71e9e` · Bytes: 2200.

<!-- SOURCE-BEGIN contracts/evidence-receipt.v1.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/evidence-receipt.v1.schema.json",
  "title": "Durable evidence receipt v1 — designed",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "receiptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "evidenceStatus": {
      "$ref": "./common.schema.json#/$defs/EvidenceStatus"
    },
    "businessStatus": {
      "$ref": "./common.schema.json#/$defs/BusinessStatus"
    },
    "receivedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "committedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "resourceVersions": {
      "$ref": "./common.schema.json#/$defs/Versions"
    },
    "problem": {
      "$ref": "./common.schema.json#/$defs/Problem"
    }
  },
  "required": [
    "schemaVersion",
    "receiptId",
    "actionId",
    "evidenceStatus",
    "businessStatus",
    "receivedAt"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "businessStatus": {
            "const": "accepted"
          }
        },
        "required": [
          "businessStatus"
        ]
      },
      "then": {
        "properties": { "committedAt": true, "resourceVersions": true },
        "required": [
          "committedAt",
          "resourceVersions"
        ],
        "not": {
          "properties": { "problem": true },
          "required": [
            "problem"
          ]
        }
      },
      "else": {
        "not": {
          "properties": { "committedAt": true },
          "required": [
            "committedAt"
          ]
        }
      }
    },
    {
      "if": {
        "properties": {
          "businessStatus": {
            "enum": [
              "rejected",
              "review-required"
            ]
          }
        },
        "required": [
          "businessStatus"
        ]
      },
      "then": {
        "properties": { "problem": true },
        "required": [
          "problem"
        ]
      }
    }
  ]
}

````
<!-- SOURCE-END contracts/evidence-receipt.v1.schema.json -->

## Original file: contracts/local-work.schema.json

SHA-256: `8e3dac6fe46e12fbfcbe5b9a36c2dfd96fdfd7788e001a9c74399b67a831bd0b` · Bytes: 6996.

<!-- SOURCE-BEGIN contracts/local-work.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/local-work.schema.json",
  "title": "Browser-local records: retained v1 and additive P35 schema 2",
  "description": "Local format only, never HTTP acceptance or authorization. Dexie schema 2 adds scoped form drafts and an atomic health marker while preserving all v1 actions, downloads, counters, projections and receipts. Native IndexedDB versions are 10 and 20. selection.exiting fences access/capture before logout; endedSession prevents an old context from reopening an exited partition. Unknown/newer data is retained; there is no deletion or 24-hour purge.",
  "$defs": {
    "Download": {
      "type": "object",
      "properties": {
        "scope": {
          "type": "string",
          "minLength": 1,
          "maxLength": 600,
          "description": "JSON.stringify([kind, tenantId, accountId, deviceId]); every business store uses this full partition key. Not a credential."
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "format": {
          "const": 1
        },
        "downloadedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "session": {
          "$ref": "session.schema.json#/$defs/SessionContext"
        },
        "ownership": {
          "$ref": "device-ownership.schema.json#/$defs/Context"
        },
        "snapshotToken": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "current": {
          "$ref": "current-activity.schema.json#/$defs/Snapshot"
        },
        "outcomes": {
          "$ref": "outcomes.schema.json#/$defs/Snapshot"
        },
        "plan": {
          "anyOf": [
            {
              "$ref": "planning.schema.json#/$defs/Plan"
            },
            {
              "type": "null"
            }
          ]
        },
        "road": {
          "anyOf": [
            {
              "$ref": "routing.schema.json#/$defs/RouteResult"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "scope",
        "roundId",
        "format",
        "downloadedAt",
        "session",
        "ownership",
        "snapshotToken",
        "current",
        "outcomes",
        "plan",
        "road"
      ],
      "additionalProperties": false
    },
    "Action": {
      "type": "object",
      "properties": {
        "scope": {
          "type": "string",
          "minLength": 1,
          "maxLength": 600,
          "description": "JSON.stringify([kind, tenantId, accountId, deviceId]); every business store uses this full partition key. Not a credential."
        },
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "sequence": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "roundId": {
          "type": "string"
        },
        "envelope": {
          "$ref": "action-envelope.v1.schema.json"
        },
        "bytes": {
          "type": "string",
          "description": "Original JSON serialization sent to the server, immutable for this action ID. Typed clients stringify this same stored envelope without mutation."
        },
        "capturedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "href": {
          "type": "string",
          "pattern": "^/"
        }
      },
      "required": [
        "scope",
        "actionId",
        "sequence",
        "roundId",
        "envelope",
        "bytes",
        "capturedAt",
        "href"
      ],
      "additionalProperties": false
    },
    "Pending": {
      "type": "object",
      "properties": {
        "scope": {
          "type": "string",
          "minLength": 1,
          "maxLength": 600,
          "description": "JSON.stringify([kind, tenantId, accountId, deviceId]); every business store uses this full partition key. Not a credential."
        },
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "sequence": {
          "type": "integer",
          "minimum": 1
        },
        "roundId": {
          "type": "string"
        },
        "operationId": {
          "$ref": "common.schema.json#/$defs/OperationId"
        },
        "taskId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "href": {
          "type": "string",
          "pattern": "^/"
        }
      },
      "required": [
        "scope",
        "actionId",
        "sequence",
        "roundId",
        "operationId",
        "taskId",
        "href"
      ],
      "additionalProperties": false
    },
    "Acknowledgement": {
      "type": "object",
      "properties": {
        "scope": {
          "type": "string",
          "minLength": 1,
          "maxLength": 600,
          "description": "JSON.stringify([kind, tenantId, accountId, deviceId]); every business store uses this full partition key. Not a credential."
        },
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "result": {
          "$ref": "action-result.v1.schema.json"
        },
        "savedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        }
      },
      "required": [
        "scope",
        "actionId",
        "result",
        "savedAt"
      ],
      "additionalProperties": false
    },
    "Selection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "scope"
      ],
      "properties": {
        "id": {
          "const": "active"
        },
        "scope": {
          "type": "string",
          "minLength": 1
        },
        "exiting": {
          "type": "boolean",
          "description": "Durable exit in progress; no local capture, cached display or automatic reselection until remote logout completes."
        }
      }
    },
    "Draft": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "scope",
        "key",
        "value",
        "savedAt"
      ],
      "properties": {
        "scope": {
          "type": "string",
          "minLength": 1
        },
        "key": {
          "type": "string",
          "minLength": 1
        },
        "value": {},
        "savedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        }
      }
    }
  }
}

````
<!-- SOURCE-END contracts/local-work.schema.json -->

## Original file: contracts/location.schema.json

SHA-256: `fdffb5d3be3b2dd413f32b8a574dd6ac4c3a882dc53aaefc0f6209dbc233333c` · Bytes: 8478.

<!-- SOURCE-BEGIN contracts/location.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/location.schema.json",
  "title": "Scoped location confirmation",
  "$defs": {
    "Candidate": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        },
        "label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        },
        "type": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        },
        "source": {
          "const": "nominatim"
        },
        "coordinates": {
          "$ref": "./common.schema.json#/$defs/Coordinates"
        }
      },
      "required": [
        "id",
        "label",
        "type",
        "source",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "Search": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "minLength": 2,
          "maxLength": 200
        }
      },
      "required": [
        "query"
      ],
      "additionalProperties": false
    },
    "Candidates": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "maxItems": 5,
          "items": {
            "$ref": "./location.schema.json#/$defs/Candidate"
          }
        },
        "attribution": {
          "type": "string"
        }
      },
      "required": [
        "items",
        "attribution"
      ],
      "additionalProperties": false
    },
    "Confirm": {
      "type": "object",
      "properties": {
        "taskId": {
          "type": "string",
          "format": "uuid"
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "expectedLocationRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "confirmed": {
          "const": true
        },
        "selection": {
          "oneOf": [
            {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "manual"
                },
                "coordinates": {
                  "$ref": "./common.schema.json#/$defs/Coordinates"
                }
              },
              "required": [
                "kind",
                "coordinates"
              ],
              "additionalProperties": false
            },
            {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "candidate"
                },
                "candidateId": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                }
              },
              "required": [
                "kind",
                "candidateId"
              ],
              "additionalProperties": false
            }
          ]
        }
      },
      "required": [
        "taskId",
        "expectedSourceRevision",
        "expectedLocationRevision",
        "confirmed",
        "selection"
      ],
      "additionalProperties": false
    },
    "Pin": {
      "type": "object",
      "properties": {
        "coordinates": {
          "$ref": "./common.schema.json#/$defs/Coordinates"
        },
        "provenance": {
          "type": "object",
          "properties": {
            "kind": {
              "enum": [
                "manual",
                "nominatim",
                "source-confirmed"
              ]
            },
            "candidate": {
              "$ref": "./location.schema.json#/$defs/Candidate"
            }
          },
          "required": [
            "kind"
          ],
          "additionalProperties": false
        },
        "confirmedBy": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "confirmedAt": {
          "type": [
            "string",
            "null"
          ],
          "format": "date-time"
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "coordinates",
        "provenance",
        "confirmedBy",
        "confirmedAt",
        "sourceRevision"
      ],
      "additionalProperties": false
    },
    "Snapshot": {
      "type": "object",
      "properties": {
        "taskId": {
          "type": "string",
          "format": "uuid"
        },
        "recipientName": {
          "type": "string"
        },
        "original": {
          "oneOf": [
            {
              "$ref": "./b2c-intake.schema.json#/$defs/AddressDestination"
            },
            {
              "$ref": "./b2c-intake.schema.json#/$defs/ConfirmedPinDestination"
            }
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "locationRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pin": {
          "oneOf": [
            {
              "$ref": "./location.schema.json#/$defs/Pin"
            },
            {
              "type": "null"
            }
          ]
        },
        "locationReadiness": {
          "enum": [
            "confirmed",
            "needs-resolution"
          ]
        },
        "editable": {
          "type": "boolean"
        },
        "planningInputRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "planningStatus": {
          "type": "string",
          "enum": [
            "not-requested",
            "pending",
            "running",
            "complete",
            "partial",
            "failed",
            "superseded"
          ],
          "description": "Actual latest durable calculation state; complete is a provider candidate, not an active round or policy guarantee."
        }
      },
      "required": [
        "taskId",
        "recipientName",
        "original",
        "sourceRevision",
        "locationRevision",
        "pin",
        "locationReadiness",
        "editable",
        "planningInputRevision",
        "planningStatus"
      ],
      "additionalProperties": false
    },
    "List": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "maxItems": 50,
          "items": {
            "$ref": "./location.schema.json#/$defs/Snapshot"
          }
        }
      },
      "required": [
        "items"
      ],
      "additionalProperties": false
    },
    "MapConfiguration": {
      "type": "object",
      "properties": {
        "styleUrl": {
          "type": "string"
        },
        "coverage": {
          "type": "string"
        },
        "attribution": {
          "type": "string"
        }
      },
      "required": [
        "styleUrl",
        "coverage",
        "attribution"
      ],
      "additionalProperties": false
    },
    "ConfirmCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "location.confirmPin"
            },
            "payload": {
              "$ref": "./location.schema.json#/$defs/Confirm"
            }
          },
          "required": [
            "operationId",
            "payload"
          ]
        }
      ]
    },
    "ConfirmedEvent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "actionId",
        "location"
      ],
      "properties": {
        "actionId": {
          "type": "string",
          "format": "uuid"
        },
        "location": {
          "$ref": "#/$defs/Snapshot"
        }
      }
    }
  }
}

````
<!-- SOURCE-END contracts/location.schema.json -->

## Original file: contracts/monitoring.schema.json

SHA-256: `0fbf77e77b680b7efb5da297c7d313e3f315ebf7b76a630b732af842b6aea3f6` · Bytes: 22099.

<!-- SOURCE-BEGIN contracts/monitoring.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/monitoring.schema.json",
  "title": "Coherent scoped monitoring",
  "$defs": {
    "Change": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "recordedAt": {
          "type": "string",
          "format": "date-time"
        },
        "correlationId": {
          "type": "string"
        }
      },
      "required": [
        "recordedAt",
        "correlationId"
      ]
    },
    "Freshness": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "refreshedAt": {
          "type": "string",
          "format": "date-time"
        },
        "receivedEvidenceOnly": {
          "const": true
        },
        "deviceContactAt": {
          "type": "null"
        },
        "lastReceivedActionAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "integrationDelivery": {
          "const": "unavailable"
        }
      },
      "required": [
        "refreshedAt",
        "receivedEvidenceOnly",
        "deviceContactAt",
        "lastReceivedActionAt",
        "integrationDelivery"
      ]
    },
    "Progress": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "shipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "attempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "processedAttempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "processedShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "fullDeliveredShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "partialShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "failedShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "remainingShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "shipments",
        "attempts",
        "processedAttempts",
        "processedShipments",
        "fullDeliveredShipments",
        "partialShipments",
        "failedShipments",
        "remainingShipments"
      ]
    },
    "Groups": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "preparedShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "heldShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "deferredShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "returnRequiredShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "heldPieces": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "returnRequiredPieces": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "preparedShipments",
        "heldShipments",
        "deferredShipments",
        "returnRequiredShipments",
        "heldPieces",
        "returnRequiredPieces"
      ]
    },
    "Round": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "roundId": {
          "type": "string",
          "format": "uuid"
        },
        "workdayId": {
          "type": "string",
          "format": "uuid"
        },
        "startedAt": {
          "type": "string",
          "format": "date-time"
        },
        "endedAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "roundId",
        "workdayId",
        "startedAt",
        "endedAt"
      ]
    },
    "Workday": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "workdayId": {
          "type": "string",
          "format": "uuid"
        },
        "openedAt": {
          "type": "string",
          "format": "date-time"
        },
        "endedAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "workdayId",
        "openedAt",
        "endedAt"
      ]
    },
    "Task": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "taskId": {
          "type": "string",
          "format": "uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "attemptId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "branchId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "integrationId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "recipientName": {
          "type": "string"
        },
        "recipientPhone": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "coordinates": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Coordinates"
            },
            {
              "type": "null"
            }
          ]
        },
        "state": {
          "enum": [
            "prepared",
            "held",
            "unassigned",
            "withdrawn",
            "personal"
          ]
        },
        "earliestAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "deferred": {
          "type": "boolean"
        },
        "outcome": {
          "anyOf": [
            {
              "enum": [
                "full",
                "partial",
                "refused",
                "no-answer"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "outcomeRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "heldPieces": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "returnRequiredPieces": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "eligible": {
          "type": "boolean"
        }
      },
      "required": [
        "taskId",
        "dispatchCycleId",
        "attemptId",
        "branchId",
        "integrationId",
        "sourceRevision",
        "assignmentRevision",
        "recipientName",
        "recipientPhone",
        "coordinates",
        "state",
        "earliestAt",
        "deferred",
        "outcome",
        "outcomeRevision",
        "heldPieces",
        "returnRequiredPieces",
        "eligible"
      ]
    },
    "Current": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "enum": [
            "customer",
            "branch"
          ]
        },
        "taskId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "attemptId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "branchId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "stage": {
          "enum": [
            "heading",
            "arrived",
            "awaiting-receipt"
          ]
        }
      },
      "required": [
        "kind",
        "taskId",
        "attemptId",
        "branchId",
        "stage"
      ]
    },
    "Plan": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "planId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "revision": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "orderedTaskIds": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          }
        }
      },
      "required": [
        "planId",
        "revision",
        "orderedTaskIds"
      ]
    },
    "Owner": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "accountId": {
          "type": "string",
          "format": "uuid"
        },
        "deviceId": {
          "type": "string",
          "format": "uuid"
        },
        "generation": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "accountId",
        "deviceId",
        "generation"
      ]
    },
    "Action": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "sourceId": {
          "type": "string",
          "format": "uuid"
        },
        "actionId": {
          "type": "string",
          "format": "uuid"
        },
        "operationId": {
          "type": "string"
        },
        "receivedAt": {
          "type": "string",
          "format": "date-time"
        },
        "acceptedAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "businessStatus": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        }
      },
      "required": [
        "sourceId",
        "actionId",
        "operationId",
        "receivedAt",
        "acceptedAt",
        "businessStatus"
      ]
    },
    "Cycle": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "dispatchCycleId": {
          "type": "string",
          "format": "uuid"
        },
        "taskId": {
          "type": "string",
          "format": "uuid"
        },
        "driverId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "state": {
          "enum": [
            "unassigned",
            "prepared",
            "held",
            "withdrawn"
          ]
        },
        "receivedAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "departureAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "latest": {
          "type": "boolean"
        }
      },
      "required": [
        "dispatchCycleId",
        "taskId",
        "driverId",
        "sourceRevision",
        "assignmentRevision",
        "state",
        "receivedAt",
        "departureAt",
        "latest"
      ]
    },
    "Attempt": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "attemptId": {
          "type": "string",
          "format": "uuid"
        },
        "taskId": {
          "type": "string",
          "format": "uuid"
        },
        "roundId": {
          "type": "string",
          "format": "uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "admittedAt": {
          "type": "string",
          "format": "date-time"
        },
        "stage": {
          "enum": [
            "available",
            "heading",
            "arrived",
            "paused",
            "resolved"
          ]
        }
      },
      "required": [
        "attemptId",
        "taskId",
        "roundId",
        "dispatchCycleId",
        "admittedAt",
        "stage"
      ]
    },
    "HistoryItem": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "outcome"
            },
            "outcome": {
              "$ref": "outcomes.schema.json#/$defs/Record"
            },
            "effective": {
              "type": "boolean"
            }
          },
          "required": [
            "kind",
            "outcome",
            "effective"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "correction"
            },
            "correction": {
              "$ref": "corrections.schema.json#/$defs/Record"
            }
          },
          "required": [
            "kind",
            "correction"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "cycle"
            },
            "cycle": {
              "$ref": "#/$defs/Cycle"
            }
          },
          "required": [
            "kind",
            "cycle"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "attempt"
            },
            "attempt": {
              "$ref": "#/$defs/Attempt"
            }
          },
          "required": [
            "kind",
            "attempt"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "action"
            },
            "action": {
              "$ref": "#/$defs/Action"
            }
          },
          "required": [
            "kind",
            "action"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "round"
            },
            "round": {
              "$ref": "#/$defs/Round"
            }
          },
          "required": [
            "kind",
            "round"
          ]
        }
      ]
    },
    "Snapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scopeKey": {
          "type": "string"
        },
        "snapshotRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "lastCommittedChange": {
          "anyOf": [
            {
              "$ref": "#/$defs/Change"
            },
            {
              "type": "null"
            }
          ]
        },
        "freshness": {
          "$ref": "#/$defs/Freshness"
        },
        "nextCursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "driverId": {
          "type": "string",
          "format": "uuid"
        },
        "workday": {
          "anyOf": [
            {
              "$ref": "#/$defs/Workday"
            },
            {
              "type": "null"
            }
          ]
        },
        "round": {
          "anyOf": [
            {
              "$ref": "#/$defs/Round"
            },
            {
              "type": "null"
            }
          ]
        },
        "current": {
          "anyOf": [
            {
              "$ref": "#/$defs/Current"
            },
            {
              "type": "null"
            }
          ]
        },
        "nextSuggestion": {
          "anyOf": [
            {
              "$ref": "#/$defs/Task"
            },
            {
              "type": "null"
            }
          ]
        },
        "plan": {
          "$ref": "#/$defs/Plan"
        },
        "owner": {
          "anyOf": [
            {
              "$ref": "#/$defs/Owner"
            },
            {
              "type": "null"
            }
          ]
        },
        "progress": {
          "$ref": "#/$defs/Progress"
        },
        "groups": {
          "$ref": "#/$defs/Groups"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Task"
          }
        }
      },
      "required": [
        "scopeKey",
        "snapshotRevision",
        "lastCommittedChange",
        "freshness",
        "nextCursor",
        "driverId",
        "workday",
        "round",
        "current",
        "nextSuggestion",
        "plan",
        "owner",
        "progress",
        "groups",
        "items"
      ]
    },
    "History": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scopeKey": {
          "type": "string"
        },
        "snapshotRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "lastCommittedChange": {
          "anyOf": [
            {
              "$ref": "#/$defs/Change"
            },
            {
              "type": "null"
            }
          ]
        },
        "freshness": {
          "$ref": "#/$defs/Freshness"
        },
        "nextCursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "resourceId": {
          "type": "string",
          "format": "uuid"
        },
        "progress": {
          "anyOf": [
            {
              "$ref": "#/$defs/Progress"
            },
            {
              "type": "null"
            }
          ]
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/HistoryItem"
          }
        }
      },
      "required": [
        "scopeKey",
        "snapshotRevision",
        "lastCommittedChange",
        "freshness",
        "nextCursor",
        "resourceId",
        "progress",
        "items"
      ]
    },
    "ActionSnapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scopeKey": {
          "type": "string"
        },
        "snapshotRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "lastCommittedChange": {
          "anyOf": [
            {
              "$ref": "#/$defs/Change"
            },
            {
              "type": "null"
            }
          ]
        },
        "freshness": {
          "$ref": "#/$defs/Freshness"
        },
        "nextCursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "action": {
          "$ref": "#/$defs/Action"
        }
      },
      "required": [
        "scopeKey",
        "snapshotRevision",
        "lastCommittedChange",
        "freshness",
        "nextCursor",
        "action"
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/monitoring.schema.json -->

## Original file: contracts/outbox.schema.json

SHA-256: `acae29b68e9e267b2d1f495c6904880f421f3959684a3c14c8fa7c40f34bbf5b` · Bytes: 17186.

<!-- SOURCE-BEGIN contracts/outbox.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/outbox.schema.json",
  "title": "P25 signed delivery and scoped operations",
  "$defs": {
    "ConfigureWebhook": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "format": "uri",
          "maxLength": 2048
        },
        "enabled": {
          "type": "boolean"
        },
        "expectedRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "url",
        "enabled",
        "expectedRevision"
      ],
      "additionalProperties": false
    },
    "RotateSigningKey": {
      "type": "object",
      "properties": {
        "keyId": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]{1,64}$"
        },
        "overlapSeconds": {
          "type": "integer",
          "minimum": 300,
          "maximum": 86400
        }
      },
      "required": [
        "keyId",
        "overlapSeconds"
      ],
      "additionalProperties": false
    },
    "RetryDelivery": {
      "type": "object",
      "properties": {
        "eventId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "eventId"
      ],
      "additionalProperties": false
    },
    "Configuration": {
      "type": "object",
      "properties": {
        "revision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "enabled": {
          "type": "boolean"
        },
        "url": {
          "type": "string",
          "format": "uri"
        }
      },
      "required": [
        "revision",
        "enabled",
        "url"
      ],
      "additionalProperties": false
    },
    "KeyRotation": {
      "type": "object",
      "properties": {
        "keyId": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]{1,64}$"
        },
        "activatedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "previousKeyId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_-]{1,64}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "verifyUntil": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "keyId",
        "activatedAt",
        "previousKeyId",
        "verifyUntil"
      ],
      "additionalProperties": false
    },
    "RetryResult": {
      "type": "object",
      "properties": {
        "eventId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "scheduled": {
          "type": "boolean"
        }
      },
      "required": [
        "eventId",
        "scheduled"
      ],
      "additionalProperties": false
    },
    "Acknowledgement": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "recipientIntegrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "eventId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "acknowledgement": {
          "const": "received"
        }
      },
      "required": [
        "schemaVersion",
        "tenantId",
        "recipientIntegrationId",
        "eventId",
        "acknowledgement"
      ],
      "additionalProperties": false
    },
    "Attempt": {
      "type": "object",
      "properties": {
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "number": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "startedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "finishedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "keyId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_-]{1,64}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "deliveryTimestamp": {
          "type": "string",
          "pattern": "^\\d{13}$"
        },
        "result": {
          "enum": [
            "sending",
            "received",
            "failed",
            "lease-expired"
          ]
        },
        "errorCode": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "httpStatus": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 100,
              "maximum": 599
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "attemptId",
        "number",
        "startedAt",
        "finishedAt",
        "keyId",
        "deliveryTimestamp",
        "result",
        "errorCode",
        "httpStatus"
      ],
      "additionalProperties": false
    },
    "Delivery": {
      "type": "object",
      "properties": {
        "eventId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "eventType": {
          "$ref": "./common.schema.json#/$defs/OperationId"
        },
        "aggregate": {
          "$ref": "./events/envelope.v1.schema.json#/properties/aggregate"
        },
        "createdAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "status": {
          "enum": [
            "pending",
            "sending",
            "failed",
            "received"
          ]
        },
        "attempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "nextAttemptAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "leaseUntil": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "receivedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "lastError": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "projectionStatus": {
          "const": "unknown"
        },
        "blockedBy": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "eventId",
        "eventType",
        "aggregate",
        "createdAt",
        "status",
        "attempts",
        "nextAttemptAt",
        "leaseUntil",
        "receivedAt",
        "lastError",
        "projectionStatus",
        "blockedBy"
      ],
      "additionalProperties": false
    },
    "Queue": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "$ref": "#/$defs/Delivery"
          }
        },
        "nextCursor": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "counts": {
          "type": "object",
          "properties": {
            "pending": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "sending": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "failed": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "received": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "pending",
            "sending",
            "failed",
            "received"
          ],
          "additionalProperties": false
        },
        "oldestUnreceivedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "projectionStatus": {
          "const": "unknown"
        }
      },
      "required": [
        "items",
        "nextCursor",
        "counts",
        "oldestUnreceivedAt",
        "projectionStatus"
      ],
      "additionalProperties": false
    },
    "Detail": {
      "type": "object",
      "properties": {
        "delivery": {
          "$ref": "#/$defs/Delivery"
        },
        "attempts": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "$ref": "#/$defs/Attempt"
          }
        },
        "nextAttemptBefore": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "delivery",
        "attempts",
        "nextAttemptBefore"
      ],
      "additionalProperties": false
    },
    "Replay": {
      "type": "object",
      "properties": {
        "events": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "$ref": "./events/sender-event.v1.schema.json"
          }
        },
        "nextAfterSequence": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "retention": {
          "const": "indefinite-no-purge"
        },
        "projectionStatus": {
          "const": "unknown"
        }
      },
      "required": [
        "events",
        "nextAfterSequence",
        "retention",
        "projectionStatus"
      ],
      "additionalProperties": false
    },
    "ConfigureWebhookCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.configureWebhook"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/ConfigureWebhook"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "RotateSigningKeyCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.rotateSigningKey"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/RotateSigningKey"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "RetryDeliveryCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.retryDelivery"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/RetryDelivery"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/outbox.schema.json -->

## Original file: contracts/outcomes.schema.json

SHA-256: `909bfc5356faa2150077754845a4f83c7328fcfe58571254e701edeab1c72927` · Bytes: 30203.

<!-- SOURCE-BEGIN contracts/outcomes.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/outcomes.schema.json",
  "title": "Authoritative outcomes and exact reported collection v1",
  "description": "Frozen outstanding EGP allocation; whole B2B pieces only. No-answer has no reported collection or shipping refusal. Amount totals in progress are decimal integer strings to avoid aggregate overflow. Transport and physical return receipt remain separate.",
  "$defs": {
    "Money": {
      "$ref": "./b2b-intake.schema.json#/$defs/Money"
    },
    "Piece": {
      "type": "object",
      "properties": {
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "delivered": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        }
      },
      "required": [
        "sourceLineId",
        "delivered"
      ],
      "additionalProperties": false
    },
    "Full": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "reportedCollection": {
          "$ref": "#/$defs/Money"
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision"
      ],
      "additionalProperties": false
    },
    "Partial": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pieces": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Piece"
          },
          "minItems": 1,
          "maxItems": 100
        },
        "reportedCollection": {
          "$ref": "#/$defs/Money"
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision",
        "pieces",
        "reportedCollection"
      ],
      "additionalProperties": false
    },
    "Refusal": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "shippingPayment": {
          "enum": [
            "collected",
            "refused"
          ]
        },
        "reportedCollection": {
          "$ref": "#/$defs/Money"
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision"
      ],
      "additionalProperties": false
    },
    "NoAnswer": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedSourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedAssignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedPinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "roundId",
        "taskId",
        "attemptId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "expectedSourceRevision",
        "expectedAssignmentRevision",
        "expectedPinRevision"
      ],
      "additionalProperties": false
    },
    "FullCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "outcome.recordFull"
            },
            "payload": {
              "$ref": "#/$defs/Full"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "PartialCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "outcome.recordPartial"
            },
            "payload": {
              "$ref": "#/$defs/Partial"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "RefusalCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "outcome.recordRefusal"
            },
            "payload": {
              "$ref": "#/$defs/Refusal"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "NoAnswerCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "outcome.recordNoAnswer"
            },
            "payload": {
              "$ref": "#/$defs/NoAnswer"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          },
          "required": []
        }
      ]
    },
    "LineResult": {
      "type": "object",
      "properties": {
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceQuantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        },
        "delivered": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "heldReturnRequired": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "unitDue": {
          "$ref": "#/$defs/Money"
        }
      },
      "required": [
        "sourceLineId",
        "sourceQuantity",
        "delivered",
        "heldReturnRequired",
        "unitDue"
      ],
      "additionalProperties": false
    },
    "Collection": {
      "type": "object",
      "properties": {
        "reported": {
          "anyOf": [
            {
              "$ref": "#/$defs/Money"
            },
            {
              "type": "null"
            }
          ]
        },
        "goods": {
          "$ref": "#/$defs/Money"
        },
        "shipping": {
          "$ref": "#/$defs/Money"
        },
        "unpaidShipping": {
          "$ref": "#/$defs/Money"
        },
        "shippingStatus": {
          "enum": [
            "collected",
            "explicitly-unpaid",
            "not-attempted",
            "not-due",
            "not-applicable"
          ]
        }
      },
      "required": [
        "reported",
        "goods",
        "shipping",
        "unpaidShipping",
        "shippingStatus"
      ],
      "additionalProperties": false
    },
    "Calculation": {
      "type": "object",
      "properties": {
        "kind": {
          "enum": [
            "company",
            "personal"
          ]
        },
        "outcome": {
          "enum": [
            "full",
            "partial",
            "refused",
            "no-answer"
          ]
        },
        "lines": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/LineResult"
          },
          "maxItems": 100
        },
        "collection": {
          "$ref": "#/$defs/Collection"
        },
        "returnRequired": {
          "type": "boolean"
        }
      },
      "required": [
        "kind",
        "outcome",
        "lines",
        "collection",
        "returnRequired"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "kind": {
                "const": "personal"
              }
            },
            "required": [
              "kind"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "outcome": {
                "enum": [
                  "full",
                  "refused",
                  "no-answer"
                ]
              },
              "lines": {
                "maxItems": 0,
                "type": "array"
              },
              "returnRequired": {
                "const": false
              },
              "collection": {
                "type": "object",
                "properties": {
                  "shippingStatus": {
                    "const": "not-applicable"
                  }
                }
              }
            },
            "type": "object"
          },
          "else": {
            "properties": {
              "lines": {
                "minItems": 1,
                "type": "array"
              }
            },
            "type": "object"
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "const": "full"
              }
            },
            "required": [
              "outcome"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "returnRequired": {
                "const": false
              },
              "lines": {
                "items": {
                  "type": "object",
                  "properties": {
                    "heldReturnRequired": {
                      "const": 0
                    }
                  }
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "enum": [
                  "refused",
                  "no-answer"
                ]
              }
            },
            "required": [
              "outcome"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "lines": {
                "items": {
                  "type": "object",
                  "properties": {
                    "delivered": {
                      "const": 0
                    }
                  }
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "const": "no-answer"
              }
            },
            "required": [
              "outcome"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "collection": {
                "type": "object",
                "properties": {
                  "reported": {
                    "type": "null"
                  },
                  "shipping": {
                    "type": "object",
                    "properties": {
                      "amountMinor": {
                        "const": 0
                      }
                    }
                  },
                  "unpaidShipping": {
                    "type": "object",
                    "properties": {
                      "amountMinor": {
                        "const": 0
                      }
                    }
                  },
                  "shippingStatus": {
                    "enum": [
                      "not-attempted",
                      "not-applicable"
                    ]
                  }
                }
              }
            },
            "type": "object"
          }
        }
      ]
    },
    "Record": {
      "type": "object",
      "properties": {
        "kind": {
          "enum": [
            "company",
            "personal"
          ]
        },
        "outcome": {
          "enum": [
            "full",
            "partial",
            "refused",
            "no-answer"
          ]
        },
        "lines": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/LineResult"
          },
          "maxItems": 100
        },
        "collection": {
          "$ref": "#/$defs/Collection"
        },
        "returnRequired": {
          "type": "boolean"
        },
        "outcomeId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "branchId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceReference": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/SourceReference"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "time": {
          "$ref": "./current-activity.schema.json#/$defs/ActionTime"
        },
        "heading": {
          "anyOf": [
            {
              "$ref": "./current-activity.schema.json#/$defs/ActionTime"
            },
            {
              "type": "null"
            }
          ]
        },
        "arrival": {
          "anyOf": [
            {
              "$ref": "./current-activity.schema.json#/$defs/ActionTime"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceDispatchCycleId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/ExternalId"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "kind",
        "outcome",
        "lines",
        "collection",
        "returnRequired",
        "outcomeId",
        "revision",
        "roundId",
        "workdayId",
        "driverId",
        "taskId",
        "attemptId",
        "dispatchCycleId",
        "branchId",
        "sourceReference",
        "sourceRevision",
        "assignmentRevision",
        "time",
        "heading",
        "arrival",
        "sourceDispatchCycleId"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "kind": {
                "const": "personal"
              }
            },
            "required": [
              "kind"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "outcome": {
                "enum": [
                  "full",
                  "refused",
                  "no-answer"
                ]
              },
              "lines": {
                "maxItems": 0,
                "type": "array"
              },
              "returnRequired": {
                "const": false
              },
              "collection": {
                "type": "object",
                "properties": {
                  "shippingStatus": {
                    "const": "not-applicable"
                  }
                }
              }
            },
            "type": "object"
          },
          "else": {
            "properties": {
              "lines": {
                "minItems": 1,
                "type": "array"
              }
            },
            "type": "object"
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "const": "full"
              }
            },
            "required": [
              "outcome"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "returnRequired": {
                "const": false
              },
              "lines": {
                "items": {
                  "type": "object",
                  "properties": {
                    "heldReturnRequired": {
                      "const": 0
                    }
                  }
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "enum": [
                  "refused",
                  "no-answer"
                ]
              }
            },
            "required": [
              "outcome"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "lines": {
                "items": {
                  "type": "object",
                  "properties": {
                    "delivered": {
                      "const": 0
                    }
                  }
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        },
        {
          "if": {
            "properties": {
              "outcome": {
                "const": "no-answer"
              }
            },
            "required": [
              "outcome"
            ],
            "type": "object"
          },
          "then": {
            "properties": {
              "collection": {
                "type": "object",
                "properties": {
                  "reported": {
                    "type": "null"
                  },
                  "shipping": {
                    "type": "object",
                    "properties": {
                      "amountMinor": {
                        "const": 0
                      }
                    }
                  },
                  "unpaidShipping": {
                    "type": "object",
                    "properties": {
                      "amountMinor": {
                        "const": 0
                      }
                    }
                  },
                  "shippingStatus": {
                    "enum": [
                      "not-attempted",
                      "not-applicable"
                    ]
                  }
                }
              }
            },
            "type": "object"
          }
        }
      ]
    },
    "CommandResult": {
      "type": "object",
      "properties": {
        "outcome": {
          "$ref": "#/$defs/Record"
        },
        "current": {
          "$ref": "./current-activity.schema.json#/$defs/CommandResult"
        }
      },
      "required": [
        "outcome",
        "current"
      ],
      "additionalProperties": false
    },
    "ActionResult": {
      "allOf": [
        {
          "$ref": "action-result.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "enum": [
                "outcome.recordFull",
                "outcome.recordPartial",
                "outcome.recordRefusal",
                "outcome.recordNoAnswer"
              ]
            }
          },
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "accepted"
                      }
                    },
                    "required": [
                      "businessStatus"
                    ]
                  }
                },
                "required": [
                  "receipt"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "response": {
                    "type": "object",
                    "properties": {
                      "body": {
                        "$ref": "#/$defs/CommandResult"
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    },
    "ActionStatus": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "pending"
            }
          },
          "required": [
            "actionId",
            "status"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            },
            "result": {
              "$ref": "#/$defs/ActionResult"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Progress": {
      "type": "object",
      "properties": {
        "processed": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "full": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "partial": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "refused": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "noAnswer": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "deliveredPieces": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "heldReturnRequiredPieces": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "collection": {
          "type": "array",
          "maxItems": 1,
          "items": {
            "type": "object",
            "properties": {
              "currency": {
                "const": "EGP"
              },
              "exponent": {
                "const": 2
              },
              "reportedMinor": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]*)$"
              },
              "unpaidShippingMinor": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]*)$"
              }
            },
            "required": [
              "currency",
              "exponent",
              "reportedMinor",
              "unpaidShippingMinor"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "processed",
        "full",
        "partial",
        "refused",
        "noAnswer",
        "deliveredPieces",
        "heldReturnRequiredPieces",
        "collection"
      ],
      "additionalProperties": false
    },
    "Snapshot": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Record"
          }
        },
        "progress": {
          "$ref": "#/$defs/Progress"
        },
        "history": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Record"
          },
          "description": "Preserved outcomes including earlier attempts. Collection totals include all history; items count latest resolved attempts only."
        },
        "custody": {
          "type": "array",
          "description": "P21 current custody for latest resolved company attempts in this snapshot. Original outcome lines retain historical return-required quantities.",
          "items": {
            "type": "object",
            "properties": {
              "outcomeId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "dispatchCycleId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "sourceLineId": {
                "$ref": "./common.schema.json#/$defs/ExternalId"
              },
              "balance": {
                "$ref": "./common.schema.json#/$defs/PieceBalance"
              }
            },
            "required": [
              "outcomeId",
              "dispatchCycleId",
              "sourceLineId",
              "balance"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "roundId",
        "items",
        "progress"
      ],
      "additionalProperties": false
    },
    "Event": {
      "type": "object",
      "properties": {
        "outcome": {
          "$ref": "#/$defs/Record"
        }
      },
      "required": [
        "outcome"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/outcomes.schema.json -->

## Original file: contracts/planning.schema.json

SHA-256: `036bd75af7d42081afd48e6688f6bb14f9f840239d39be1c67d87aacace7f04e` · Bytes: 44862.

<!-- SOURCE-BEGIN contracts/planning.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/planning.schema.json",
  "title": "Durable planning and forecast revisions v1",
  "$defs": {
    "Status": {
      "type": "string",
      "enum": [
        "pending",
        "running",
        "complete",
        "partial",
        "failed",
        "superseded"
      ]
    },
    "Settings": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "routing.schema.json#/$defs/Mode"
        },
        "origin": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "manual-pin"
            },
            "coordinates": {
              "$ref": "common.schema.json#/$defs/Coordinates"
            }
          },
          "required": [
            "kind",
            "coordinates"
          ],
          "additionalProperties": false
        },
        "endpoint": {
          "$ref": "routing.schema.json#/$defs/Endpoint",
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "kind": {
                    "const": "branch"
                  }
                },
                "required": [
                  "kind"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "branchId": {
                    "$ref": "common.schema.json#/$defs/Uuid"
                  }
                }
              }
            }
          ]
        },
        "plannedStartAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "mode",
        "origin",
        "endpoint",
        "plannedStartAt"
      ],
      "additionalProperties": false,
      "description": "Explicit manual origin, never GPS or physical arrival. plannedStartAt is the eligibility and forecast anchor, not round start. Whole-route policy validates the endpoint."
    },
    "SaveDraft": {
      "type": "object",
      "properties": {
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedSettingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "settings": {
          "$ref": "#/$defs/Settings"
        }
      },
      "required": [
        "driverId",
        "expectedSettingsRevision",
        "settings"
      ],
      "additionalProperties": false
    },
    "Request": {
      "type": "object",
      "properties": {
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedSettingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "driverId",
        "expectedSettingsRevision"
      ],
      "additionalProperties": false
    },
    "Member": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "branchId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "integrationId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "coordinates": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Coordinates"
            },
            {
              "type": "null"
            }
          ]
        },
        "priority": {
          "enum": [
            "ordinary",
            "urgent"
          ]
        },
        "earliestAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "departureAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "reservationState": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "eligible": {
          "type": "boolean"
        },
        "exclusionReason": {
          "anyOf": [
            {
              "enum": [
                "not-held",
                "location-unresolved",
                "future",
                "not-reserved",
                "resolved-or-paused"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "serviceEstimateSeconds": {
          "const": 600
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "dispatchCycleId",
        "branchId",
        "integrationId",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "coordinates",
        "priority",
        "earliestAt",
        "departureAt",
        "reservationState",
        "eligible",
        "exclusionReason",
        "serviceEstimateSeconds"
      ],
      "additionalProperties": false
    },
    "Input": {
      "type": "object",
      "properties": {
        "version": {
          "const": 1
        },
        "tenantId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "accountKind": {
          "enum": [
            "personal",
            "company"
          ]
        },
        "inputRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "settingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "executionRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "manualRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "currentTarget": {
          "anyOf": [
            {
              "type": "object",
              "properties": {
                "taskId": {
                  "$ref": "common.schema.json#/$defs/Uuid"
                },
                "attemptId": {
                  "$ref": "common.schema.json#/$defs/Uuid"
                },
                "revision": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 9007199254740991
                }
              },
              "required": [
                "taskId",
                "attemptId",
                "revision"
              ],
              "additionalProperties": false
            },
            {
              "type": "null"
            }
          ]
        },
        "locationInputRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "settings": {
          "anyOf": [
            {
              "$ref": "#/$defs/InputSettings"
            },
            {
              "type": "null"
            }
          ]
        },
        "members": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Member"
          }
        },
        "physicalOrigin": {
          "anyOf": [
            {
              "$ref": "current-activity.schema.json#/$defs/PhysicalOrigin"
            },
            {
              "type": "null"
            }
          ],
          "description": "Absent or null means no recorded physical correction/arrival. Omitted until evidence exists to preserve unchanged pre-P16 input fingerprints."
        },
        "branchActivity": {
          "$ref": "current-activity.schema.json#/$defs/BranchActivity"
        }
      },
      "required": [
        "version",
        "tenantId",
        "driverId",
        "accountKind",
        "inputRevision",
        "settingsRevision",
        "executionRevision",
        "manualRevision",
        "currentTarget",
        "locationInputRevision",
        "settings",
        "members"
      ],
      "additionalProperties": false
    },
    "Job": {
      "type": "object",
      "properties": {
        "jobId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "$ref": "#/$defs/Status"
        },
        "fingerprint": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "settingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "blockedReason": {
          "anyOf": [
            {
              "enum": [
                "settings-required",
                "no-eligible-work",
                "capacity-exceeded",
                "branch-service"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "attempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "leaseExpiresAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "nextAttemptAt": {
          "type": "string",
          "format": "date-time"
        },
        "error": {
          "anyOf": [
            {
              "$ref": "routing.schema.json#/$defs/Failure"
            },
            {
              "type": "null"
            }
          ]
        },
        "planId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "supersededByJobId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "finishedAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "resultKind": {
          "anyOf": [
            {
              "enum": [
                "full",
                "partial",
                "invalid",
                "dependency-failed"
              ]
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "jobId",
        "driverId",
        "status",
        "fingerprint",
        "settingsRevision",
        "blockedReason",
        "attempts",
        "leaseExpiresAt",
        "nextAttemptAt",
        "error",
        "planId",
        "supersededByJobId",
        "createdAt",
        "finishedAt"
      ],
      "additionalProperties": false,
      "description": "Durable calculation state. resultKind distinguishes full, partial, invalid provider/policy response and dependency failure. Historical P13 complete jobs may still point to unvalidated drafts; inspect the plan state. Never implies an active round.",
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "status": {
                "enum": [
                  "running"
                ]
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "leaseExpiresAt": {
                "type": "string",
                "format": "date-time"
              },
              "attempts": {
                "type": "integer",
                "minimum": 1
              }
            }
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "status": {
                "enum": [
                  "pending",
                  "complete",
                  "partial",
                  "failed",
                  "superseded"
                ]
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "leaseExpiresAt": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "status": {
                "enum": [
                  "pending",
                  "running"
                ]
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "planId": {
                "type": "null"
              },
              "finishedAt": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "status": {
                "enum": [
                  "complete",
                  "partial"
                ]
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "planId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "finishedAt": {
                "type": "string",
                "format": "date-time"
              },
              "error": {
                "type": "null"
              },
              "blockedReason": {
                "type": "null"
              }
            }
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "status": {
                "enum": [
                  "failed",
                  "superseded"
                ]
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "planId": {
                "type": "null"
              },
              "finishedAt": {
                "type": "string",
                "format": "date-time"
              }
            }
          }
        }
      ]
    },
    "DraftResult": {
      "type": "object",
      "properties": {
        "settingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "job": {
          "$ref": "#/$defs/Job"
        }
      },
      "required": [
        "settingsRevision",
        "job"
      ],
      "additionalProperties": false
    },
    "ForecastMember": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "membership": {
          "enum": [
            "assigned",
            "unassigned",
            "excluded",
            "manual",
            "paused"
          ]
        },
        "exclusionReason": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "position": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 1
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedArrivalAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedCompletionAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "dispatchCycleId",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "membership",
        "exclusionReason",
        "position",
        "expectedArrivalAt",
        "expectedCompletionAt"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "membership": {
                "const": "assigned"
              }
            },
            "required": [
              "membership"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "position": {
                "type": "integer",
                "minimum": 1
              },
              "expectedArrivalAt": {
                "type": "string",
                "format": "date-time"
              },
              "expectedCompletionAt": {
                "type": "string",
                "format": "date-time"
              }
            }
          },
          "else": {
            "if": {
              "type": "object",
              "properties": {
                "membership": {
                  "enum": [
                    "manual",
                    "paused"
                  ]
                }
              },
              "required": [
                "membership"
              ]
            },
            "then": {
              "type": "object",
              "properties": {
                "position": {
                  "type": "integer",
                  "minimum": 1
                },
                "expectedArrivalAt": {
                  "type": "null"
                },
                "expectedCompletionAt": {
                  "type": "null"
                }
              }
            },
            "else": {
              "type": "object",
              "properties": {
                "position": {
                  "type": "null"
                },
                "expectedArrivalAt": {
                  "type": "null"
                },
                "expectedCompletionAt": {
                  "type": "null"
                }
              }
            }
          }
        }
      ]
    },
    "Forecast": {
      "type": "object",
      "properties": {
        "forecastId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workloadId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "kind": {
          "const": "planning-estimate"
        },
        "timeOrigin": {
          "type": "string",
          "format": "date-time"
        },
        "expectedFinishAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "members": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ForecastMember"
          }
        }
      },
      "required": [
        "forecastId",
        "workloadId",
        "kind",
        "timeOrigin",
        "expectedFinishAt",
        "members"
      ],
      "additionalProperties": false
    },
    "Plan": {
      "type": "object",
      "properties": {
        "planId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "jobId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "fingerprint": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "state": {
          "enum": [
            "draft",
            "ready",
            "partial",
            "manual",
            "branch"
          ]
        },
        "current": {
          "type": "boolean"
        },
        "inputCurrent": {
          "type": "boolean"
        },
        "policyValidated": {
          "type": "boolean"
        },
        "candidate": {
          "anyOf": [
            {
              "$ref": "routing.schema.json#/$defs/OptimizationResult"
            },
            {
              "type": "null"
            }
          ]
        },
        "input": {
          "$ref": "#/$defs/Input"
        },
        "forecast": {
          "$ref": "#/$defs/Forecast"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "routePolicy": {
          "$ref": "#/$defs/RoutePolicy"
        }
      },
      "required": [
        "planId",
        "jobId",
        "driverId",
        "revision",
        "fingerprint",
        "state",
        "current",
        "inputCurrent",
        "policyValidated",
        "candidate",
        "input",
        "forecast",
        "createdAt"
      ],
      "additionalProperties": false,
      "description": "Immutable historical draft, validated ready or explicit partial plan. Only a current valid ready/manual revision may be considered for online start by P15. No baseline is overwritten.",
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "state": {
                "enum": [
                  "manual",
                  "branch"
                ]
              }
            },
            "required": [
              "state"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "candidate": {
                "type": "null"
              },
              "jobId": {
                "type": "null"
              },
              "forecast": {
                "type": "object",
                "properties": {
                  "expectedFinishAt": {
                    "type": "null"
                  }
                }
              },
              "routePolicy": {
                "type": "object",
                "properties": {
                  "method": {
                    "enum": [
                      "manual",
                      "branch-service"
                    ]
                  }
                }
              }
            }
          },
          "else": {
            "type": "object",
            "properties": {
              "candidate": {
                "$ref": "routing.schema.json#/$defs/OptimizationResult"
              },
              "jobId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              }
            },
            "allOf": [
              {
                "if": {
                  "type": "object",
                  "properties": {
                    "candidate": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "const": "partial"
                        }
                      },
                      "required": [
                        "status"
                      ]
                    }
                  }
                },
                "then": {
                  "type": "object",
                  "properties": {
                    "forecast": {
                      "type": "object",
                      "properties": {
                        "expectedFinishAt": {
                          "type": "null"
                        }
                      }
                    }
                  }
                },
                "else": {
                  "type": "object",
                  "properties": {
                    "forecast": {
                      "type": "object",
                      "properties": {
                        "expectedFinishAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            ]
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "state": {
                "enum": [
                  "ready",
                  "partial",
                  "manual",
                  "branch"
                ]
              }
            },
            "required": [
              "state"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "policyValidated": {
                "const": true
              },
              "routePolicy": {
                "$ref": "#/$defs/RoutePolicy"
              }
            },
            "required": [
              "routePolicy"
            ]
          },
          "else": {
            "type": "object",
            "properties": {
              "policyValidated": {
                "const": false
              }
            }
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "state": {
                "const": "ready"
              }
            },
            "required": [
              "state"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "candidate": {
                "type": "object",
                "properties": {
                  "status": {
                    "const": "complete"
                  },
                  "visits": {
                    "type": "array",
                    "minItems": 1
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "type": "object",
            "properties": {
              "state": {
                "const": "partial"
              }
            },
            "required": [
              "state"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "candidate": {
                "type": "object",
                "properties": {
                  "status": {
                    "const": "partial"
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "state": {
                "const": "branch"
              }
            },
            "required": [
              "state"
            ]
          },
          "then": {
            "properties": {
              "routePolicy": {
                "properties": {
                  "method": {
                    "const": "branch-service"
                  }
                },
                "type": "object"
              }
            }
          },
          "else": {
            "properties": {
              "routePolicy": {
                "properties": {
                  "method": {
                    "enum": [
                      "manual",
                      "grouped-heuristic"
                    ]
                  }
                },
                "type": "object"
              }
            }
          }
        }
      ]
    },
    "Plans": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Plan"
          }
        },
        "nextCursor": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "latestJob": {
          "anyOf": [
            {
              "$ref": "#/$defs/Job"
            },
            {
              "type": "null"
            }
          ]
        },
        "settingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "inputRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "manualRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "continuation": {
          "anyOf": [
            {
              "$ref": "#/$defs/Continuation"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "items",
        "nextCursor",
        "latestJob",
        "settingsRevision"
      ],
      "additionalProperties": false
    },
    "PublishedEvent": {
      "type": "object",
      "properties": {
        "jobId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "planId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "forecastId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workloadId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "state": {
          "enum": [
            "draft",
            "ready",
            "partial",
            "manual",
            "branch"
          ]
        },
        "status": {
          "enum": [
            "complete",
            "partial",
            "manual",
            "branch"
          ]
        },
        "policyValidated": {
          "type": "boolean"
        }
      },
      "required": [
        "jobId",
        "planId",
        "driverId",
        "revision",
        "forecastId",
        "workloadId",
        "state",
        "status",
        "policyValidated"
      ],
      "additionalProperties": false
    },
    "SaveDraftCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "planning.saveDraft"
            },
            "payload": {
              "$ref": "#/$defs/SaveDraft"
            }
          }
        }
      ]
    },
    "RequestPreviewCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "planning.requestPreview"
            },
            "payload": {
              "$ref": "#/$defs/Request"
            }
          }
        }
      ]
    },
    "RequestReplanCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "planning.requestReplan"
            },
            "payload": {
              "$ref": "#/$defs/Request"
            }
          }
        }
      ]
    },
    "RoutePolicy": {
      "type": "object",
      "properties": {
        "version": {
          "const": 1
        },
        "method": {
          "enum": [
            "grouped-heuristic",
            "manual",
            "branch-service"
          ]
        },
        "orderedTaskIds": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "maxItems": 50,
          "uniqueItems": true
        },
        "exceptions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "taskId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "reason": {
                "enum": [
                  "unassigned-current",
                  "unassigned-urgent",
                  "unassigned-ordinary",
                  "blocked-by-current"
                ]
              }
            },
            "required": [
              "taskId",
              "reason"
            ],
            "additionalProperties": false
          }
        },
        "branchStop": {
          "type": "object",
          "properties": {
            "segmentId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "branchId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "coordinates": {
              "$ref": "common.schema.json#/$defs/Coordinates"
            },
            "serviceEstimateSeconds": {
              "type": "integer",
              "minimum": 0,
              "maximum": 86400
            }
          },
          "required": [
            "segmentId",
            "branchId",
            "coordinates",
            "serviceEstimateSeconds"
          ],
          "additionalProperties": false
        },
        "roadRoute": {
          "anyOf": [
            {
              "$ref": "routing.schema.json#/$defs/RouteResult"
            },
            {
              "type": "null"
            }
          ],
          "description": "P33 optional OSRM-validated road geometry for this immutable plan order, captured outside the publication transaction. Null or absent means unavailable (including older/manual plans). It does not establish basemap coverage, movement, arrival or a new forecast."
        }
      },
      "required": [
        "version",
        "method",
        "orderedTaskIds",
        "exceptions"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "method": {
                "const": "branch-service"
              }
            },
            "required": [
              "method"
            ]
          },
          "then": {
            "properties": {
              "orderedTaskIds": {
                "maxItems": 0,
                "type": "array"
              },
              "exceptions": {
                "maxItems": 0,
                "type": "array"
              },
              "branchStop": {
                "type": "object",
                "properties": {
                  "segmentId": {
                    "$ref": "common.schema.json#/$defs/Uuid"
                  },
                  "branchId": {
                    "$ref": "common.schema.json#/$defs/Uuid"
                  },
                  "coordinates": {
                    "$ref": "common.schema.json#/$defs/Coordinates"
                  },
                  "serviceEstimateSeconds": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 86400
                  }
                },
                "required": [
                  "segmentId",
                  "branchId",
                  "coordinates",
                  "serviceEstimateSeconds"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "branchStop"
            ]
          },
          "else": {
            "not": {
              "required": [
                "branchStop"
              ],
              "properties": {
                "branchStop": {}
              }
            }
          }
        }
      ]
    },
    "ManualOrder": {
      "type": "object",
      "properties": {
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedSettingsRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedInputRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedManualRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "selection": {
          "oneOf": [
            {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "order"
                },
                "taskIds": {
                  "type": "array",
                  "items": {
                    "$ref": "common.schema.json#/$defs/Uuid"
                  },
                  "minItems": 1,
                  "maxItems": 50,
                  "uniqueItems": true
                }
              },
              "required": [
                "kind",
                "taskIds"
              ],
              "additionalProperties": false
            },
            {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "select-first"
                },
                "taskId": {
                  "$ref": "common.schema.json#/$defs/Uuid"
                }
              },
              "required": [
                "kind",
                "taskId"
              ],
              "additionalProperties": false
            }
          ]
        }
      },
      "required": [
        "driverId",
        "expectedSettingsRevision",
        "expectedInputRevision",
        "expectedManualRevision",
        "selection"
      ],
      "additionalProperties": false,
      "description": "An explicit complete eligible manual sequence, or a first suggestion followed by retained/grouped remaining work. Does not assert heading, physical arrival or round start. Current target and urgent order remain constraints. Unknown road metrics and times stay null."
    },
    "ManualOrderCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "planning.setManualOrder"
            },
            "payload": {
              "$ref": "#/$defs/ManualOrder"
            }
          }
        }
      ]
    },
    "ManualResult": {
      "type": "object",
      "properties": {
        "planId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "manualRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "inputRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "planId",
        "revision",
        "manualRevision",
        "inputRevision"
      ],
      "additionalProperties": false
    },
    "Continuation": {
      "type": "object",
      "properties": {
        "sourcePlanId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "orderedTaskIds": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "minItems": 1,
          "maxItems": 50,
          "uniqueItems": true
        },
        "mode": {
          "const": "reoptimization-pending"
        },
        "requiresManualConfirmation": {
          "const": true
        },
        "roadMetricsAvailable": {
          "const": false
        }
      },
      "required": [
        "sourcePlanId",
        "orderedTaskIds",
        "mode",
        "requiresManualConfirmation",
        "roadMetricsAvailable"
      ],
      "additionalProperties": false
    },
    "InputSettings": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "routing.schema.json#/$defs/Mode"
        },
        "origin": {
          "$ref": "routing.schema.json#/$defs/Origin"
        },
        "endpoint": {
          "$ref": "routing.schema.json#/$defs/Endpoint",
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "kind": {
                    "const": "branch"
                  }
                },
                "required": [
                  "kind"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "branchId": {
                    "$ref": "common.schema.json#/$defs/Uuid"
                  }
                }
              }
            }
          ]
        },
        "plannedStartAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "mode",
        "origin",
        "endpoint",
        "plannedStartAt"
      ],
      "additionalProperties": false,
      "description": "Server-effective settings. Origin is the last explicit arrival/manual correction, falling back to the draft manual pin. A caller cannot assert last-confirmed-stop through saveDraft."
    }
  }
}

````
<!-- SOURCE-END contracts/planning.schema.json -->

## Original file: contracts/provisioning.schema.json

SHA-256: `a6fe07968bcc85452431ff858764fc934b740ee522ab968859dcd2a0da7679b8` · Bytes: 36921.

<!-- SOURCE-BEGIN contracts/provisioning.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/provisioning.schema.json",
  "title": "ERP provisioning v1",
  "description": "Closed service-operation commands. One increasing revision stream per entity/externalId, shared by all user operations. Subject ownership is reserved by operator bootstrap. References never cross sources. No human actor assertion, password, fleet or commercial fields. Full snapshots replace only the fields owned by the named operation. Empty arrays clear; null location/vehicleReference clears.",
  "$defs": {
    "BindSource": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "companyCode": {
          "type": "string",
          "pattern": "^[A-Z0-9-]{2,32}$"
        },
        "displayName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "subjectIds": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          "uniqueItems": true,
          "maxItems": 100
        },
        "credentialId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "secretHash": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "expiresAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "intakeCapabilities": {
          "type": "array",
          "items": {
            "enum": [
              "intake.prepare",
              "assignment.manage"
            ]
          },
          "uniqueItems": true,
          "maxItems": 2,
          "description": "Operator-owned service grants. Omit to preserve existing grants; empty removes both."
        },
        "returnCapabilities": {
          "type": "array",
          "items": {
            "enum": [
              "return.receive",
              "return.dispose"
            ]
          },
          "uniqueItems": true,
          "description": "Operator-only full replacement of return grants; omitted preserves, [] clears. Separate from intakeCapabilities."
        },
        "monitoringCapabilities": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 1,
          "items": {
            "enum": [
              "monitor.read"
            ]
          },
          "description": "Operator-only replacement of monitoring grants. Omitted preserves; [] revokes. Never permits another source or branch."
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "companyCode",
        "displayName",
        "subjectIds",
        "credentialId",
        "secretHash",
        "expiresAt"
      ],
      "additionalProperties": false
    },
    "RotateCredential": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "credentialId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "secretHash": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "expiresAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "overlapSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        },
        "recover": {
          "type": "boolean"
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "credentialId",
        "secretHash",
        "expiresAt",
        "overlapSeconds",
        "recover"
      ],
      "additionalProperties": false
    },
    "DisableSource": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        }
      },
      "required": [
        "externalId",
        "sourceRevision"
      ],
      "additionalProperties": false
    },
    "Branch": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "enabled": {
          "type": "boolean"
        },
        "location": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Coordinates"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "name",
        "enabled",
        "location"
      ],
      "additionalProperties": false
    },
    "DisableBranch": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        }
      },
      "required": [
        "externalId",
        "sourceRevision"
      ],
      "additionalProperties": false
    },
    "Role": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "capabilities": {
          "type": "array",
          "items": {
            "$ref": "./common.schema.json#/$defs/Capability"
          },
          "uniqueItems": true,
          "maxItems": 100
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "name",
        "capabilities"
      ],
      "additionalProperties": false
    },
    "User": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "subject": {
          "type": "string",
          "minLength": 1,
          "maxLength": 512
        },
        "roleExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "branchExternalIds": {
          "type": "array",
          "items": {
            "$ref": "./common.schema.json#/$defs/ExternalId"
          },
          "uniqueItems": true,
          "maxItems": 100
        },
        "enabled": {
          "type": "boolean"
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "subject",
        "roleExternalId",
        "branchExternalIds",
        "enabled"
      ],
      "additionalProperties": false
    },
    "UserRole": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "roleExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "roleExternalId"
      ],
      "additionalProperties": false
    },
    "UserExceptions": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "exceptions": {
          "type": "array",
          "items": {
            "$ref": "./common.schema.json#/$defs/CapabilityOverride"
          },
          "uniqueItems": true,
          "maxItems": 100
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "exceptions"
      ],
      "additionalProperties": false
    },
    "UserBranches": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "branchExternalIds": {
          "type": "array",
          "items": {
            "$ref": "./common.schema.json#/$defs/ExternalId"
          },
          "uniqueItems": true,
          "maxItems": 100
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "branchExternalIds"
      ],
      "additionalProperties": false
    },
    "DisableUser": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        }
      },
      "required": [
        "externalId",
        "sourceRevision"
      ],
      "additionalProperties": false
    },
    "Driver": {
      "type": "object",
      "properties": {
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "userExternalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "enabled": {
          "type": "boolean"
        },
        "vehicleReference": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/ExternalId"
            },
            {
              "type": "null"
            }
          ]
        },
        "profile": {
          "enum": [
            "car",
            "motorcycle",
            "bicycle"
          ]
        }
      },
      "required": [
        "externalId",
        "sourceRevision",
        "userExternalId",
        "enabled",
        "vehicleReference",
        "profile"
      ],
      "additionalProperties": false
    },
    "VerifiedService": {
      "type": "object",
      "properties": {
        "mode": {
          "const": "service-operation"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "actorId": {
          "type": "null"
        }
      },
      "required": [
        "mode",
        "tenantId",
        "integrationId",
        "actorId"
      ],
      "additionalProperties": false
    },
    "ProvisioningStatus": {
      "type": "object",
      "properties": {
        "entity": {
          "enum": [
            "source",
            "branch",
            "role",
            "user",
            "driver"
          ]
        },
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "resourceId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "lastActionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "issuerStatus": {
          "enum": [
            "not-required",
            "pending",
            "running",
            "retry",
            "ready"
          ]
        },
        "attempts": {
          "type": "integer",
          "minimum": 0
        },
        "nextAttemptAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "lastError": {
          "enum": [
            null,
            "issuer_unavailable",
            "subject_unavailable"
          ]
        },
        "enabled": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Requested local projection enabled state; null for a role. ready plus enabled=false means disable reconciliation completed, never account-ready."
        }
      },
      "required": [
        "entity",
        "externalId",
        "resourceId",
        "sourceRevision",
        "lastActionId",
        "issuerStatus",
        "attempts",
        "nextAttemptAt",
        "lastError",
        "enabled"
      ],
      "additionalProperties": false
    },
    "SourceConfiguration": {
      "type": "object",
      "properties": {
        "identity": {
          "$ref": "#/$defs/VerifiedService"
        },
        "issuer": {
          "type": "string",
          "format": "uri"
        },
        "supportedVersions": {
          "type": "array",
          "items": {
            "const": "1.0.0"
          },
          "uniqueItems": true,
          "maxItems": 100
        },
        "allowedOperations": {
          "type": "array",
          "items": {
            "$ref": "./common.schema.json#/$defs/OperationId"
          },
          "uniqueItems": true,
          "maxItems": 100
        },
        "humanDelegation": {
          "const": false
        }
      },
      "required": [
        "identity",
        "issuer",
        "supportedVersions",
        "allowedOperations",
        "humanDelegation"
      ],
      "additionalProperties": false
    },
    "ProvisioningChanged": {
      "type": "object",
      "properties": {
        "entity": {
          "enum": [
            "source",
            "branch",
            "role",
            "user",
            "driver"
          ]
        },
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "resourceId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceRevision": {
          "$ref": "./common.schema.json#/$defs/Revision"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "service": {
          "$ref": "#/$defs/VerifiedService"
        }
      },
      "required": [
        "entity",
        "externalId",
        "resourceId",
        "sourceRevision",
        "actionId",
        "service"
      ],
      "additionalProperties": false
    },
    "BindSourceCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.bindSource"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/BindSource"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "RotateCredentialCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.rotateCredential"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/RotateCredential"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "DisableSourceCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "integration.disableSource"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/DisableSource"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "BranchCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "branch.provision"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Branch"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "DisableBranchCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "branch.disable"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/DisableBranch"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "RoleCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "role.defineCapabilities"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Role"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "UserCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "user.provision"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/User"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "UserRoleCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "user.setRole"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/UserRole"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "UserExceptionsCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "user.setCapabilityExceptions"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/UserExceptions"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "UserBranchesCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "user.setBranchMemberships"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/UserBranches"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "DisableUserCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "user.disable"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/DisableUser"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "DriverCommand": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "driver.provisionReference"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0,
          "items": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          }
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Driver"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/provisioning.schema.json -->

## Original file: contracts/reporting.schema.json

SHA-256: `3a6cb386d62c2a25656f5ea5068c713cfef767a6185eb11f291a570b8f4c82d7` · Bytes: 27051.

<!-- SOURCE-BEGIN contracts/reporting.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/reporting.schema.json",
  "title": "Effective authorized workday reports and action-time comparisons",
  "$defs": {
    "Filters": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "roundId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "driverId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "branchId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "outcome": {
          "anyOf": [
            {
              "enum": [
                "full",
                "partial",
                "refused",
                "no-answer",
                "unfinished",
                "deferred"
              ]
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "roundId",
        "driverId",
        "branchId",
        "outcome"
      ]
    },
    "Counts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "shipments": {
          "type": "integer",
          "minimum": 0
        },
        "attempts": {
          "type": "integer",
          "minimum": 0
        },
        "processedAttempts": {
          "type": "integer",
          "minimum": 0
        },
        "failedAttempts": {
          "type": "integer",
          "minimum": 0
        },
        "deferredAttempts": {
          "type": "integer",
          "minimum": 0
        },
        "processedShipments": {
          "type": "integer",
          "minimum": 0
        },
        "fullShipments": {
          "type": "integer",
          "minimum": 0
        },
        "partialShipments": {
          "type": "integer",
          "minimum": 0
        },
        "refusedShipments": {
          "type": "integer",
          "minimum": 0
        },
        "noAnswerShipments": {
          "type": "integer",
          "minimum": 0
        },
        "unfinishedShipments": {
          "type": "integer",
          "minimum": 0
        },
        "deferredShipments": {
          "type": "integer",
          "minimum": 0
        },
        "fullDeliveryPercent": {
          "anyOf": [
            {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "shipments",
        "attempts",
        "processedAttempts",
        "failedAttempts",
        "deferredAttempts",
        "processedShipments",
        "fullShipments",
        "partialShipments",
        "refusedShipments",
        "noAnswerShipments",
        "unfinishedShipments",
        "deferredShipments",
        "fullDeliveryPercent"
      ]
    },
    "Collection": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "exponent": {
          "type": "integer",
          "minimum": 0,
          "maximum": 6
        },
        "reportedMinor": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "goodsMinor": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "shippingMinor": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "unpaidShippingMinor": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "unreportedAttempts": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "currency",
        "exponent",
        "reportedMinor",
        "goodsMinor",
        "shippingMinor",
        "unpaidShippingMinor",
        "unreportedAttempts"
      ]
    },
    "Pieces": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "dispatched": {
          "type": "integer",
          "minimum": 0
        },
        "delivered": {
          "type": "integer",
          "minimum": 0
        },
        "held": {
          "type": "integer",
          "minimum": 0
        },
        "returnRequired": {
          "type": "integer",
          "minimum": 0
        },
        "received": {
          "type": "integer",
          "minimum": 0
        },
        "lost": {
          "type": "integer",
          "minimum": 0
        },
        "damaged": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "dispatched",
        "delivered",
        "held",
        "returnRequired",
        "received",
        "lost",
        "damaged"
      ]
    },
    "Return": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "transitionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "kind": {
          "enum": [
            "received",
            "lost",
            "damaged"
          ]
        },
        "sourceLineId": {
          "type": "string"
        },
        "quantity": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "transitionId",
        "kind",
        "sourceLineId",
        "quantity"
      ]
    },
    "Time": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "status": {
          "enum": [
            "available",
            "missing",
            "uncertain"
          ]
        },
        "observedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "recordedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "actionId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "clock": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/ClockEvidence"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "status",
        "observedAt",
        "recordedAt",
        "actionId",
        "clock"
      ],
      "allOf": [
        {
          "if": {
            "properties": {
              "status": {
                "const": "missing"
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "properties": {
              "observedAt": {
                "type": "null"
              }
            }
          },
          "else": {
            "properties": {
              "observedAt": {
                "$ref": "./common.schema.json#/$defs/UtcInstant"
              }
            }
          }
        }
      ]
    },
    "Measurement": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "seconds": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ]
        },
        "reason": {
          "anyOf": [
            {
              "enum": [
                "missing-boundary",
                "uncertain-clock",
                "clock-order",
                "different-device",
                "interrupted",
                "changed-workload",
                "unfinished",
                "scoped-view",
                "endpoint-unobserved",
                "forecast-unavailable",
                "identity-changed",
                "identity-unavailable"
              ]
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "seconds",
        "reason"
      ],
      "oneOf": [
        {
          "properties": {
            "seconds": {
              "type": "null"
            },
            "reason": {
              "type": "string"
            }
          }
        },
        {
          "properties": {
            "seconds": {
              "type": "number"
            },
            "reason": {
              "type": "null"
            }
          }
        }
      ]
    },
    "ForecastStop": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "forecastId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "workloadId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "planRevision": {
          "type": "integer",
          "minimum": 1
        },
        "capturedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "membership": {
          "enum": [
            "assigned",
            "manual",
            "unassigned",
            "excluded",
            "paused"
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0
        },
        "expectedArrivalAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedCompletionAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "identityMatches": {
          "type": "boolean"
        }
      },
      "required": [
        "forecastId",
        "workloadId",
        "planRevision",
        "capturedAt",
        "membership",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "expectedArrivalAt",
        "expectedCompletionAt",
        "identityMatches"
      ]
    },
    "Attempt": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "branchId": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "recipientName": {
          "type": "string"
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0
        },
        "admittedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "outcome": {
          "anyOf": [
            {
              "$ref": "./outcomes.schema.json#/$defs/Record"
            },
            {
              "type": "null"
            }
          ]
        },
        "history": {
          "type": "array",
          "items": {
            "$ref": "./outcomes.schema.json#/$defs/Record"
          }
        },
        "corrections": {
          "type": "array",
          "items": {
            "$ref": "./corrections.schema.json#/$defs/Record"
          }
        },
        "deferred": {
          "type": "boolean"
        },
        "returns": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Return"
          }
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "roundId",
        "dispatchCycleId",
        "branchId",
        "recipientName",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "admittedAt",
        "outcome",
        "history",
        "corrections",
        "deferred",
        "returns"
      ]
    },
    "StopTiming": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "baseline": {
          "anyOf": [
            {
              "$ref": "#/$defs/ForecastStop"
            },
            {
              "type": "null"
            }
          ]
        },
        "latest": {
          "anyOf": [
            {
              "$ref": "#/$defs/ForecastStop"
            },
            {
              "type": "null"
            }
          ]
        },
        "revisions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ForecastStop"
          }
        },
        "heading": {
          "$ref": "#/$defs/Time"
        },
        "arrival": {
          "$ref": "#/$defs/Time"
        },
        "completion": {
          "$ref": "#/$defs/Time"
        },
        "travel": {
          "$ref": "#/$defs/Measurement"
        },
        "service": {
          "$ref": "#/$defs/Measurement"
        },
        "baselineArrivalDifference": {
          "$ref": "#/$defs/Measurement"
        },
        "baselineCompletionDifference": {
          "$ref": "#/$defs/Measurement"
        },
        "latestArrivalDifference": {
          "$ref": "#/$defs/Measurement"
        },
        "latestCompletionDifference": {
          "$ref": "#/$defs/Measurement"
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "baseline",
        "latest",
        "revisions",
        "heading",
        "arrival",
        "completion",
        "travel",
        "service",
        "baselineArrivalDifference",
        "baselineCompletionDifference",
        "latestArrivalDifference",
        "latestCompletionDifference"
      ]
    },
    "Forecast": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "planId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "forecastId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "workloadId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "planRevision": {
          "type": "integer",
          "minimum": 1
        },
        "capturedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "timeOrigin": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "expectedFinishAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "customerAttempts": {
          "type": "integer",
          "minimum": 0
        },
        "branchStops": {
          "type": "integer",
          "minimum": 0
        },
        "endpoint": {
          "enum": [
            "last-customer",
            "fixed",
            "branch"
          ]
        },
        "kind": {
          "enum": [
            "ready",
            "manual",
            "partial",
            "branch"
          ]
        }
      },
      "required": [
        "planId",
        "forecastId",
        "workloadId",
        "planRevision",
        "capturedAt",
        "timeOrigin",
        "expectedFinishAt",
        "customerAttempts",
        "branchStops",
        "endpoint",
        "kind"
      ]
    },
    "BranchVisit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "segmentId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "branchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "stage": {
          "type": "string"
        },
        "serviceEstimateSeconds": {
          "type": "integer",
          "minimum": 0
        },
        "heading": {
          "$ref": "#/$defs/Time"
        },
        "arrival": {
          "$ref": "#/$defs/Time"
        },
        "completion": {
          "$ref": "#/$defs/Time"
        },
        "travel": {
          "$ref": "#/$defs/Measurement"
        },
        "service": {
          "$ref": "#/$defs/Measurement"
        }
      },
      "required": [
        "segmentId",
        "branchId",
        "stage",
        "serviceEstimateSeconds",
        "heading",
        "arrival",
        "completion",
        "travel",
        "service"
      ]
    },
    "RoundTiming": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "visibility": {
          "enum": [
            "whole-round",
            "authorized-subset"
          ]
        },
        "acceptedStartAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "acceptedEndAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "start": {
          "$ref": "#/$defs/Time"
        },
        "end": {
          "$ref": "#/$defs/Time"
        },
        "baseline": {
          "anyOf": [
            {
              "$ref": "#/$defs/Forecast"
            },
            {
              "type": "null"
            }
          ]
        },
        "latest": {
          "anyOf": [
            {
              "$ref": "#/$defs/Forecast"
            },
            {
              "type": "null"
            }
          ]
        },
        "revisions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Forecast"
          }
        },
        "scopeChanged": {
          "type": "boolean"
        },
        "interrupted": {
          "type": "boolean"
        },
        "unfinishedAttempts": {
          "type": "integer",
          "minimum": 0
        },
        "closure": {
          "enum": [
            "open",
            "ended-unfinished",
            "ended-resolved",
            "scoped-view"
          ]
        },
        "baselineFinishDifference": {
          "$ref": "#/$defs/Measurement"
        },
        "latestFinishDifference": {
          "$ref": "#/$defs/Measurement"
        },
        "elapsed": {
          "$ref": "#/$defs/Measurement"
        },
        "stops": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/StopTiming"
          }
        },
        "branchVisits": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/BranchVisit"
          }
        }
      },
      "required": [
        "roundId",
        "workdayId",
        "visibility",
        "acceptedStartAt",
        "acceptedEndAt",
        "start",
        "end",
        "baseline",
        "latest",
        "revisions",
        "scopeChanged",
        "interrupted",
        "unfinishedAttempts",
        "closure",
        "baselineFinishDifference",
        "latestFinishDifference",
        "elapsed",
        "stops",
        "branchVisits"
      ]
    },
    "Round": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "startedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "endedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "roundId",
        "startedAt",
        "endedAt"
      ]
    },
    "Workday": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "definitionVersion": {
          "const": "1.0.0"
        },
        "snapshotId": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "asOf": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "displayTimeZone": {
          "const": "Africa/Cairo"
        },
        "acceptedOnly": {
          "const": true
        },
        "pendingLocalActions": {
          "const": "not-known-to-server"
        },
        "filters": {
          "$ref": "#/$defs/Filters"
        },
        "workdayId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "openedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "endedAt": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "scopeCounts": {
          "$ref": "#/$defs/Counts"
        },
        "counts": {
          "$ref": "#/$defs/Counts"
        },
        "collections": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Collection"
          }
        },
        "pieces": {
          "anyOf": [
            {
              "$ref": "#/$defs/Pieces"
            },
            {
              "type": "null"
            }
          ]
        },
        "rounds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Round"
          }
        },
        "attempts": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Attempt"
          }
        },
        "timing": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/RoundTiming"
          }
        }
      },
      "required": [
        "definitionVersion",
        "snapshotId",
        "asOf",
        "displayTimeZone",
        "acceptedOnly",
        "pendingLocalActions",
        "filters",
        "workdayId",
        "driverId",
        "openedAt",
        "endedAt",
        "scopeCounts",
        "counts",
        "collections",
        "pieces",
        "rounds",
        "attempts",
        "timing"
      ]
    },
    "DayList": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "workdayId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "driverId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "openedAt": {
                "$ref": "./common.schema.json#/$defs/UtcInstant"
              },
              "endedAt": {
                "anyOf": [
                  {
                    "$ref": "./common.schema.json#/$defs/UtcInstant"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "driverLabel": {
                "type": "string"
              }
            },
            "required": [
              "workdayId",
              "driverId",
              "openedAt",
              "endedAt",
              "driverLabel"
            ]
          }
        },
        "nextBefore": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "branches": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "branchId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "label": {
                "type": "string"
              }
            },
            "required": [
              "branchId",
              "label"
            ]
          }
        }
      },
      "required": [
        "items",
        "nextBefore",
        "branches"
      ]
    },
    "TimingSnapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "snapshotId": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "asOf": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "displayTimeZone": {
          "const": "Africa/Cairo"
        },
        "filters": {
          "$ref": "#/$defs/Filters"
        },
        "timing": {
          "$ref": "#/$defs/RoundTiming"
        }
      },
      "required": [
        "snapshotId",
        "asOf",
        "displayTimeZone",
        "filters",
        "timing"
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/reporting.schema.json -->

## Original file: contracts/returns.schema.json

SHA-256: `4f2c517fb110241dc841addab69b74aead712b5604cd642138ce1473d8f6949f` · Bytes: 22682.

<!-- SOURCE-BEGIN contracts/returns.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/returns.schema.json",
  "title": "Source-branch offers, actual subset receipt and separate disposition v1",
  "description": "Request is an offer only. Item revisions fence incremental receipt/disposition; unresolved never implies clearance. Confirmation checks only the explicitly claimed subset. No stock or commercial settlement claim. No returns quota; request body size remains transport bounded. Service operations use explicit grants and actorId null, never caller-asserted human identity. Duplicate item keys rejected by domain validation. Request cannot block an otherwise compatible whole retry.",
  "$defs": {
    "Offer": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "outcomeId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "quantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        }
      },
      "required": [
        "taskId",
        "dispatchCycleId",
        "outcomeId",
        "sourceLineId",
        "quantity"
      ],
      "additionalProperties": false
    },
    "Request": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceBranchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Offer"
          },
          "minItems": 1
        }
      },
      "required": [
        "roundId",
        "sourceBranchId",
        "items"
      ],
      "additionalProperties": false
    },
    "SubsetItem": {
      "type": "object",
      "properties": {
        "itemId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "expectedRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "quantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        }
      },
      "required": [
        "itemId",
        "expectedRevision",
        "quantity"
      ],
      "additionalProperties": false
    },
    "Receive": {
      "type": "object",
      "properties": {
        "requestId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "receivingBranchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/SubsetItem"
          },
          "minItems": 1
        }
      },
      "required": [
        "requestId",
        "receivingBranchId",
        "items"
      ],
      "additionalProperties": false
    },
    "Dispose": {
      "type": "object",
      "properties": {
        "requestId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "receivingBranchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/SubsetItem"
          },
          "minItems": 1
        },
        "disposition": {
          "enum": [
            "lost",
            "damaged"
          ]
        }
      },
      "required": [
        "requestId",
        "receivingBranchId",
        "items",
        "disposition"
      ],
      "additionalProperties": false
    },
    "RequestCommand": {
      "allOf": [
        {
          "$ref": "./action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "return.requestHandover"
            },
            "context": {
              "$ref": "./common.schema.json#/$defs/DeviceContext"
            },
            "payload": {
              "$ref": "#/$defs/Request"
            }
          },
          "required": [
            "operationId",
            "context",
            "payload"
          ]
        }
      ]
    },
    "ReceiveCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "return.confirmSubsetReceipt"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Receive"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "DisposeCommand": {
      "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
      "type": "object",
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "const": "return.recordDisposition"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "integration"
            },
            "tenantId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            "integrationId": {
              "$ref": "./common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "tenantId",
            "integrationId"
          ],
          "additionalProperties": false
        },
        "resources": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "baseVersions": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "dependsOnActionIds": {
          "type": "array",
          "maxItems": 0
        },
        "observation": {
          "$ref": "./common.schema.json#/$defs/Observation"
        },
        "payload": {
          "$ref": "#/$defs/Dispose"
        }
      },
      "required": [
        "schemaVersion",
        "payloadVersion",
        "actionId",
        "operationId",
        "context",
        "resources",
        "baseVersions",
        "dependsOnActionIds",
        "observation",
        "payload"
      ],
      "additionalProperties": false
    },
    "Custody": {
      "$ref": "./common.schema.json#/$defs/PieceBalance"
    },
    "Item": {
      "type": "object",
      "properties": {
        "itemId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "outcomeId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "requested": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        },
        "received": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "lost": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "damaged": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "unresolved": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "eligibility": {
          "enum": [
            "pending",
            "settled",
            "superseded"
          ]
        },
        "custody": {
          "$ref": "#/$defs/Custody"
        }
      },
      "required": [
        "itemId",
        "taskId",
        "dispatchCycleId",
        "outcomeId",
        "attemptId",
        "sourceLineId",
        "externalId",
        "sourceDispatchCycleId",
        "sourceRevision",
        "revision",
        "requested",
        "received",
        "lost",
        "damaged",
        "unresolved",
        "eligibility",
        "custody"
      ],
      "additionalProperties": false
    },
    "RequestView": {
      "type": "object",
      "properties": {
        "requestId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceBranchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "requestedAt": {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Item"
          },
          "minItems": 1
        },
        "sourceBranchName": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "description": "Current source-provisioned branch label for driver display; sourceBranchId remains authoritative."
        }
      },
      "required": [
        "requestId",
        "driverId",
        "sourceBranchId",
        "integrationId",
        "roundId",
        "requestedAt",
        "items"
      ],
      "additionalProperties": false
    },
    "RequestList": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/RequestView"
          },
          "minItems": 0
        },
        "nextCursor": {
          "anyOf": [
            {
              "$ref": "./common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "items",
        "nextCursor"
      ],
      "additionalProperties": false
    },
    "GroupLine": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "outcomeId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "availableToRequest": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "custody": {
          "$ref": "#/$defs/Custody"
        }
      },
      "required": [
        "taskId",
        "dispatchCycleId",
        "outcomeId",
        "sourceLineId",
        "externalId",
        "sourceDispatchCycleId",
        "availableToRequest",
        "custody"
      ],
      "additionalProperties": false
    },
    "Group": {
      "type": "object",
      "properties": {
        "sourceBranchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/GroupLine"
          },
          "minItems": 1
        },
        "sourceBranchName": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "description": "Current source-provisioned branch label for driver display; sourceBranchId remains authoritative."
        }
      },
      "required": [
        "sourceBranchId",
        "integrationId",
        "items"
      ],
      "additionalProperties": false
    },
    "Groups": {
      "type": "object",
      "properties": {
        "groups": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Group"
          },
          "minItems": 0
        },
        "pendingRequests": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/RequestView"
          },
          "description": "Authorized unresolved offers rediscovered across reload and phone takeover; request is not physical receipt."
        }
      },
      "required": [
        "groups"
      ],
      "additionalProperties": false
    },
    "Claim": {
      "type": "object",
      "properties": {
        "itemId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "quantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        }
      },
      "required": [
        "itemId",
        "quantity"
      ],
      "additionalProperties": false
    },
    "ConfirmationQuery": {
      "type": "object",
      "properties": {
        "claims": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Claim"
          },
          "minItems": 1
        }
      },
      "required": [
        "claims"
      ],
      "additionalProperties": false
    },
    "Confirmation": {
      "type": "object",
      "properties": {
        "requestId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "state": {
          "enum": [
            "confirmed",
            "waiting"
          ]
        },
        "message": {
          "type": "string"
        },
        "claims": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "itemId": {
                "$ref": "./common.schema.json#/$defs/Uuid"
              },
              "claimed": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000000
              },
              "confirmed": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              },
              "waiting": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              }
            },
            "required": [
              "itemId",
              "claimed",
              "confirmed",
              "waiting"
            ],
            "additionalProperties": false
          },
          "minItems": 1
        }
      },
      "required": [
        "requestId",
        "state",
        "message",
        "claims"
      ],
      "additionalProperties": false
    },
    "Transition": {
      "type": "object",
      "properties": {
        "transitionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "requestId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "itemId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "taskId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "outcomeId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "sourceLineId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceReference": {
          "$ref": "./common.schema.json#/$defs/SourceReference"
        },
        "sourceDispatchCycleId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "sourceBranchId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "kind": {
          "enum": [
            "received",
            "lost",
            "damaged"
          ]
        },
        "quantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "time": {
          "$ref": "./current-activity.schema.json#/$defs/ActionTime"
        },
        "identity": {
          "$ref": "./provisioning.schema.json#/$defs/VerifiedService"
        }
      },
      "required": [
        "transitionId",
        "requestId",
        "itemId",
        "taskId",
        "dispatchCycleId",
        "outcomeId",
        "sourceLineId",
        "sourceReference",
        "sourceDispatchCycleId",
        "sourceBranchId",
        "kind",
        "quantity",
        "revision",
        "time",
        "identity"
      ],
      "additionalProperties": false
    },
    "CommandResult": {
      "type": "object",
      "properties": {
        "request": {
          "$ref": "#/$defs/RequestView"
        },
        "transitions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Transition"
          },
          "minItems": 0
        }
      },
      "required": [
        "request",
        "transitions"
      ],
      "additionalProperties": false
    },
    "ActionResult": {
      "$ref": "./action-result.v1.schema.json"
    },
    "ActionStatus": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "pending",
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/ActionResult"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    "RequestedEvent": {
      "type": "object",
      "properties": {
        "request": {
          "$ref": "#/$defs/RequestView"
        }
      },
      "required": [
        "request"
      ],
      "additionalProperties": false
    },
    "ReceivedEvent": {
      "type": "object",
      "properties": {
        "transition": {
          "allOf": [
            {
              "$ref": "#/$defs/Transition"
            },
            {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "received"
                }
              },
              "required": [
                "kind"
              ]
            }
          ]
        }
      },
      "required": [
        "transition"
      ],
      "additionalProperties": false
    },
    "DispositionEvent": {
      "type": "object",
      "properties": {
        "transition": {
          "allOf": [
            {
              "$ref": "#/$defs/Transition"
            },
            {
              "type": "object",
              "properties": {
                "kind": {
                  "enum": [
                    "lost",
                    "damaged"
                  ]
                }
              },
              "required": [
                "kind"
              ]
            }
          ]
        }
      },
      "required": [
        "transition"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/returns.schema.json -->

## Original file: contracts/round-start.schema.json

SHA-256: `86f030f677de2adfa1dce5dea1d8a5391c70dc2c3d86b7d346039380f94e629b` · Bytes: 11580.

<!-- SOURCE-BEGIN contracts/round-start.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/round-start.schema.json",
  "title": "Online round start and departure authority v1",
  "$defs": {
    "ReadinessRequest": {
      "type": "object",
      "properties": {
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "planId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedPlanRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "relevantActionIds": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "uniqueItems": true,
          "maxItems": 1000
        }
      },
      "required": [
        "driverId",
        "deviceId",
        "planId",
        "expectedPlanRevision",
        "relevantActionIds"
      ],
      "additionalProperties": false,
      "description": "Online preparation verifies each relevant action is durably accepted in the authenticated account, and reads fresh authorized planning input. P34 supplies the complete local journal barrier; omitted unsent actions cannot be discovered by the server. No alreadySynced flag."
    },
    "Readiness": {
      "type": "object",
      "properties": {
        "readinessId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "planId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "planRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "inputFingerprint": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "verifiedActionIds": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "uniqueItems": true
        },
        "issuedAt": {
          "type": "string",
          "format": "date-time"
        },
        "expiresAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "readinessId",
        "driverId",
        "deviceId",
        "planId",
        "planRevision",
        "inputFingerprint",
        "verifiedActionIds",
        "issuedAt",
        "expiresAt"
      ],
      "additionalProperties": false,
      "description": "Server-issued evidence expires after 60 seconds and is bound to account/device/plan/input. Start rechecks authority, accepted dependencies and the locked fingerprint. It does not activate work."
    },
    "Start": {
      "type": "object",
      "properties": {
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "readinessId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "planId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedPlanRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "driverId",
        "readinessId",
        "planId",
        "expectedPlanRevision"
      ],
      "additionalProperties": false
    },
    "Workday": {
      "type": "object",
      "properties": {
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "state": {
          "const": "open"
        },
        "openedAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "workdayId",
        "driverId",
        "state",
        "openedAt"
      ],
      "additionalProperties": false
    },
    "Round": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "state": {
          "const": "active"
        },
        "startedAt": {
          "type": "string",
          "format": "date-time"
        },
        "owner": {
          "type": "object",
          "properties": {
            "accountId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "deviceId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "generation": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "accountId",
            "deviceId",
            "generation"
          ],
          "additionalProperties": false
        },
        "firstPlanId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "firstForecastId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "firstWorkloadId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "currentActivity": {
          "anyOf": [
            {
              "$ref": "current-activity.schema.json#/$defs/Activity"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "roundId",
        "workdayId",
        "driverId",
        "state",
        "startedAt",
        "owner",
        "firstPlanId",
        "firstForecastId",
        "firstWorkloadId",
        "currentActivity"
      ],
      "additionalProperties": false,
      "description": "Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20."
    },
    "Current": {
      "type": "object",
      "properties": {
        "workday": {
          "anyOf": [
            {
              "$ref": "#/$defs/Workday"
            },
            {
              "type": "null"
            }
          ]
        },
        "round": {
          "anyOf": [
            {
              "$ref": "#/$defs/Round"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "workday",
        "round"
      ],
      "additionalProperties": false
    },
    "StartResult": {
      "type": "object",
      "properties": {
        "disposition": {
          "enum": [
            "started",
            "already-active"
          ]
        },
        "workday": {
          "$ref": "#/$defs/Workday"
        },
        "round": {
          "$ref": "#/$defs/Round"
        }
      },
      "required": [
        "disposition",
        "workday",
        "round"
      ],
      "additionalProperties": false
    },
    "StartCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "round.start"
            },
            "payload": {
              "$ref": "#/$defs/Start"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              }
            }
          }
        }
      ]
    },
    "ActionStatus": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "pending"
            }
          },
          "required": [
            "actionId",
            "status"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            },
            "result": {
              "$ref": "#/$defs/StartActionResult"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        }
      ]
    },
    "StartedEvent": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "startedAt": {
          "type": "string",
          "format": "date-time"
        },
        "firstPlanId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "firstForecastId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "firstWorkloadId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "taskIds": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "minItems": 1,
          "uniqueItems": true
        }
      },
      "required": [
        "roundId",
        "workdayId",
        "driverId",
        "startedAt",
        "firstPlanId",
        "firstForecastId",
        "firstWorkloadId",
        "taskIds"
      ],
      "additionalProperties": false
    },
    "StartActionResult": {
      "allOf": [
        {
          "$ref": "action-result.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "round.start"
            }
          },
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "accepted"
                      }
                    },
                    "required": [
                      "businessStatus"
                    ]
                  }
                },
                "required": [
                  "receipt"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "response": {
                    "type": "object",
                    "properties": {
                      "body": {
                        "$ref": "#/$defs/StartResult"
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/round-start.schema.json -->

## Original file: contracts/routing.schema.json

SHA-256: `164fe51675a27b82b1ff6cba92c88a4a768bbbe3406cb50a549343e6a340e793` · Bytes: 13403.

<!-- SOURCE-BEGIN contracts/routing.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/routing.schema.json",
  "title": "Tawsel normalized routing boundary v1",
  "$defs": {
    "Mode": {
      "type": "string",
      "enum": [
        "car",
        "motorcycle",
        "bicycle"
      ]
    },
    "Origin": {
      "type": "object",
      "properties": {
        "kind": {
          "type": "string",
          "enum": [
            "last-confirmed-stop",
            "manual-pin",
            "branch-pin"
          ]
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        }
      },
      "required": [
        "kind",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "Endpoint": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "last-customer"
            }
          },
          "required": [
            "kind"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "fixed"
            },
            "coordinates": {
              "$ref": "common.schema.json#/$defs/Coordinates"
            }
          },
          "required": [
            "kind",
            "coordinates"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "branch"
            },
            "branchId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            "coordinates": {
              "$ref": "common.schema.json#/$defs/Coordinates"
            },
            "serviceEstimateSeconds": {
              "type": "integer",
              "minimum": 0,
              "maximum": 86400
            }
          },
          "required": [
            "kind",
            "branchId",
            "coordinates",
            "serviceEstimateSeconds"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Job": {
      "type": "object",
      "properties": {
        "taskId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        "serviceEstimateSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400,
          "description": "Optional customer service estimate; adapter applies 600 seconds when omitted."
        }
      },
      "required": [
        "taskId",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "OptimizationInput": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "#/$defs/Mode"
        },
        "accountKind": {
          "type": "string",
          "enum": [
            "personal",
            "company"
          ]
        },
        "origin": {
          "$ref": "#/$defs/Origin"
        },
        "endpoint": {
          "$ref": "#/$defs/Endpoint"
        },
        "tasks": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Job"
          },
          "minItems": 1,
          "maxItems": 50
        }
      },
      "required": [
        "mode",
        "accountKind",
        "origin",
        "endpoint",
        "tasks"
      ],
      "additionalProperties": false,
      "description": "Internal normalized planning boundary; not an available HTTP operation. Origin must be resolved from authoritative physical confirmation or explicit pin by the caller. Default customer service is 600 seconds. Relative timing starts at zero; urgency/earliest availability/stitched policy are validated above the adapter in P14."
    },
    "RouteInput": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "#/$defs/Mode"
        },
        "coordinates": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Coordinates"
          },
          "minItems": 2,
          "maxItems": 52
        }
      },
      "required": [
        "mode",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "TableInput": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "#/$defs/Mode"
        },
        "coordinates": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Coordinates"
          },
          "minItems": 1,
          "maxItems": 52
        }
      },
      "required": [
        "mode",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "Leg": {
      "type": "object",
      "properties": {
        "durationSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "distanceMetres": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "durationSeconds",
        "distanceMetres"
      ],
      "additionalProperties": false
    },
    "RouteResult": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "#/$defs/Mode"
        },
        "status": {
          "const": "complete"
        },
        "geometrySource": {
          "const": "osrm-road"
        },
        "geometry": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Coordinates"
          },
          "minItems": 2,
          "maxItems": 100000
        },
        "durationSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "distanceMetres": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "legs": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Leg"
          },
          "minItems": 1,
          "maxItems": 51
        }
      },
      "required": [
        "mode",
        "status",
        "geometrySource",
        "geometry",
        "durationSeconds",
        "distanceMetres",
        "legs"
      ],
      "additionalProperties": false
    },
    "TableCell": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "status": {
              "const": "reachable"
            },
            "durationSeconds": {
              "type": "number",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "distanceMetres": {
              "type": "number",
              "minimum": 0,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "status",
            "durationSeconds",
            "distanceMetres"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "status": {
              "const": "unreachable"
            }
          },
          "required": [
            "status"
          ],
          "additionalProperties": false
        }
      ]
    },
    "TableResult": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "#/$defs/Mode"
        },
        "status": {
          "type": "string",
          "enum": [
            "complete",
            "partial"
          ]
        },
        "cells": {
          "type": "array",
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/TableCell"
            },
            "minItems": 1,
            "maxItems": 52
          },
          "minItems": 1,
          "maxItems": 52
        }
      },
      "required": [
        "mode",
        "status",
        "cells"
      ],
      "additionalProperties": false
    },
    "Visit": {
      "type": "object",
      "properties": {
        "taskId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        "arrivalOffsetSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "travelDurationSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "distanceMetres": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "serviceEstimateSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        },
        "waitingSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "taskId",
        "coordinates",
        "arrivalOffsetSeconds",
        "travelDurationSeconds",
        "distanceMetres",
        "serviceEstimateSeconds",
        "waitingSeconds"
      ],
      "additionalProperties": false
    },
    "OptimizationResult": {
      "type": "object",
      "properties": {
        "mode": {
          "$ref": "#/$defs/Mode"
        },
        "status": {
          "type": "string",
          "enum": [
            "complete",
            "partial"
          ]
        },
        "policyValidated": {
          "const": false
        },
        "visits": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Visit"
          },
          "minItems": 0,
          "maxItems": 50
        },
        "unassignedTaskIds": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "minItems": 0,
          "maxItems": 50
        },
        "travelDurationSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "distanceMetres": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "customerServiceEstimateSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "branchServiceEstimateSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        },
        "waitingSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "finishOffsetSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "endpoint": {
          "$ref": "#/$defs/Endpoint"
        }
      },
      "required": [
        "mode",
        "status",
        "policyValidated",
        "visits",
        "unassignedTaskIds",
        "travelDurationSeconds",
        "distanceMetres",
        "customerServiceEstimateSeconds",
        "branchServiceEstimateSeconds",
        "waitingSeconds",
        "finishOffsetSeconds",
        "endpoint"
      ],
      "additionalProperties": false,
      "description": "Validated provider candidate only, not a published or policy-verified route, arrival, receipt, outcome or actual dwell time. No optimizer geometry is promoted as a verified road route; request OSRM route separately."
    },
    "Failure": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "enum": [
            "invalid_input",
            "invalid_config",
            "busy",
            "timeout",
            "cancelled",
            "unavailable",
            "http_error",
            "provider_error",
            "invalid_response",
            "no_route",
            "no_table"
          ]
        },
        "provider": {
          "type": "string",
          "enum": [
            "osrm",
            "vroom",
            "boundary"
          ]
        }
      },
      "required": [
        "code",
        "provider"
      ],
      "additionalProperties": false
    },
    "Profiles": {
      "type": "object",
      "properties": {
        "modes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Mode"
          },
          "minItems": 3,
          "maxItems": 3,
          "uniqueItems": true
        },
        "defaultCustomerServiceSeconds": {
          "type": "integer",
          "const": 600
        },
        "liveVerification": {
          "type": "string",
          "const": "not-checked"
        }
      },
      "required": [
        "modes",
        "defaultCustomerServiceSeconds",
        "liveVerification"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/routing.schema.json -->

## Original file: contracts/session.schema.json

SHA-256: `4e36e094d482ff40e7964733fce8c30433b61844234b786b863de378470d2684` · Bytes: 3865.

<!-- SOURCE-BEGIN contracts/session.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/session.schema.json",
  "$defs": {
    "AccountKind": { "type": "string", "enum": ["company", "personal"] },
    "KindRequest": { "type": "object", "additionalProperties": false, "required": ["kind"], "properties": { "kind": { "$ref": "#/$defs/AccountKind" } } },
    "CompanyRequest": { "type": "object", "additionalProperties": false, "required": ["code"], "properties": { "code": { "type": "string", "pattern": "^[A-Za-z0-9-]{2,32}$" } } },
    "CompanyResponse": { "type": "object", "additionalProperties": false, "required": ["code", "displayName"], "properties": { "code": { "type": "string" }, "displayName": { "type": "string" } } },
    "LoginRequest": { "type": "object", "additionalProperties": false, "required": ["kind"], "properties": {
      "kind": { "$ref": "#/$defs/AccountKind" },
      "companyCode": { "type": "string", "pattern": "^[A-Za-z0-9-]{2,32}$" },
      "phone": { "type": "string", "minLength": 8, "maxLength": 40 },
      "intent": { "type": "string", "enum": ["login", "register", "recover"] },
      "reauthenticate": { "type": "boolean" },
      "expectedAccount": { "description": "P35 restriction for same-account OIDC recovery when the old cookie is unavailable. These public identity references confer no authentication or authorization. Callback must match the server-resolved subject and tenant; current access is still required.", "type": "object", "additionalProperties": false, "required": ["tenantId", "accountId"], "properties": { "tenantId": { "$ref": "./common.schema.json#/$defs/Uuid" }, "accountId": { "$ref": "./common.schema.json#/$defs/Uuid" } } }
    }, "allOf": [{ "if": { "required": ["expectedAccount"], "properties": { "expectedAccount": {} } }, "then": { "required": ["reauthenticate"], "properties": { "reauthenticate": { "const": true } } } }] },
    "RedirectResponse": { "type": "object", "additionalProperties": false, "required": ["authorizationUrl"], "properties": { "authorizationUrl": { "type": "string", "format": "uri" } } },
    "BootstrapResponse": { "type": "object", "additionalProperties": false, "required": ["csrfToken"], "properties": { "csrfToken": { "type": "string", "minLength": 43, "maxLength": 43 } } },
    "CallbackQuery": { "type": "object", "additionalProperties": false, "required": ["state"], "properties": { "state": { "type": "string", "minLength": 43, "maxLength": 43 }, "code": { "type": "string", "minLength": 1, "maxLength": 2048 }, "iss": { "type": "string", "maxLength": 2048 }, "session_state": { "type": "string", "maxLength": 512 }, "error": { "type": "string", "maxLength": 128 }, "error_description": { "type": "string", "maxLength": 1024 } } },
    "SessionContext": { "type": "object", "additionalProperties": false, "required": ["kind", "access", "expiresAt", "recoveryEmailVerified", "phoneOwnershipVerified", "loginIdentifier"], "properties": {
      "kind": { "$ref": "#/$defs/AccountKind" },
      "access": { "$ref": "./common.schema.json#/$defs/AccessContext" },
      "expiresAt": { "type": "string", "format": "date-time" },
      "loginIdentifier": { "type": "string", "minLength": 1, "maxLength": 512 },
      "recoveryEmailVerified": { "type": "boolean" },
      "phoneOwnershipVerified": { "const": false }
    } },
    "AuthError": { "type": "object", "additionalProperties": false, "required": ["error"], "properties": { "error": { "type": "object", "additionalProperties": false, "required": ["code", "message"], "properties": { "code": { "type": "string", "enum": ["invalid_request", "csrf_invalid", "rate_limited", "login_failed", "company_unavailable", "access_disabled", "session_expired", "issuer_unavailable", "same_account_required", "phone_invalid"] }, "message": { "type": "string" } } } } }
  }
}

````
<!-- SOURCE-END contracts/session.schema.json -->

## Original file: contracts/source.schema.json

SHA-256: `a715ce999fdca0d7dff7cef0877f65ac6b9a6fc4813fc1341978c83b4e529ae3` · Bytes: 5872.

<!-- SOURCE-BEGIN contracts/source.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/source.schema.json",
  "title": "Reference ERP source status v1",
  "description": "Consumer-owned read, never a Tawsel database or submission endpoint. Local revisions and desired changes do not imply execution acceptance. The bounded view explicitly reports truncation; retained CLI history remains in the source database.",
  "$defs": {
    "Command": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "actionId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "$ref": "./common.schema.json#/$defs/OperationId"
        },
        "status": {
          "enum": [
            "pending",
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "attempts": {
          "type": "integer",
          "minimum": 0
        },
        "lastError": {
          "type": [
            "string",
            "null"
          ]
        },
        "result": {
          "oneOf": [
            {
              "$ref": "./action-result.v1.schema.json"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "actionId",
        "operationId",
        "status",
        "attempts",
        "lastError",
        "result"
      ],
      "allOf": [
        {
          "if": {
            "properties": {
              "status": {
                "const": "pending"
              }
            }
          },
          "then": {
            "properties": {
              "result": {
                "type": "null"
              }
            }
          },
          "else": {
            "properties": {
              "result": {
                "$ref": "./action-result.v1.schema.json"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "status": {
                "const": "accepted"
              }
            }
          },
          "then": {
            "properties": {
              "result": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "accepted"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "status": {
                "const": "rejected"
              }
            }
          },
          "then": {
            "properties": {
              "result": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "rejected"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "status": {
                "const": "review-required"
              }
            }
          },
          "then": {
            "properties": {
              "result": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "review-required"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    },
    "Record": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "enum": [
            "branch",
            "role",
            "user",
            "driver",
            "shipment",
            "return"
          ]
        },
        "externalId": {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        "localRevision": {
          "type": "integer",
          "minimum": 1
        },
        "commandId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "pending",
            "accepted",
            "rejected",
            "review-required"
          ]
        }
      },
      "required": [
        "kind",
        "externalId",
        "localRevision",
        "commandId",
        "status"
      ]
    },
    "Status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schemaVersion": {
          "const": "1.0.0"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "commands": {
          "type": "array",
          "maxItems": 200,
          "items": {
            "$ref": "#/$defs/Command"
          }
        },
        "records": {
          "type": "array",
          "maxItems": 200,
          "items": {
            "$ref": "#/$defs/Record"
          }
        },
        "truncated": {
          "type": "boolean"
        }
      },
      "required": [
        "schemaVersion",
        "tenantId",
        "integrationId",
        "commands",
        "records",
        "truncated"
      ]
    }
  }
}

````
<!-- SOURCE-END contracts/source.schema.json -->

## Original file: contracts/sync.schema.json

SHA-256: `d5e8884719dade7563fa2cdc69bbe5845ae58849c7eb4ae38661d6dd1a8fb977` · Bytes: 3806.

<!-- SOURCE-BEGIN contracts/sync.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/sync.schema.json",
  "title": "Ordered device replay and preserved conflicts",
  "description": "Released schemaVersion/payloadVersion 1.0.0/1.0.0 readers remain available for retained queues. Unsupported pairs reject the outer request with unsupported_schema_version and no evidence receipt; keep original bytes/identity locally. No default translation or expiry-based purge. A durable received rejection/review is safe for account exit, independently of business acceptance.",
  "$defs": {
    "Batch": {
      "type": "object",
      "properties": {
        "actions": {
          "type": "array",
          "minItems": 1,
          "maxItems": 50,
          "items": {
            "$ref": "action-envelope.v1.schema.json"
          }
        }
      },
      "required": [
        "actions"
      ],
      "additionalProperties": false
    },
    "Entry": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "received"
            },
            "result": {
              "$ref": "action-result.v1.schema.json"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "waiting"
            },
            "dependencies": {
              "type": "array",
              "items": {
                "$ref": "common.schema.json#/$defs/Uuid"
              }
            }
          },
          "required": [
            "actionId",
            "status",
            "dependencies"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "not-received"
            },
            "code": {
              "type": "string"
            },
            "message": {
              "type": "string"
            },
            "retryable": {
              "type": "boolean"
            }
          },
          "required": [
            "actionId",
            "status",
            "code",
            "message",
            "retryable"
          ],
          "additionalProperties": false
        }
      ]
    },
    "BatchResult": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "minItems": 1,
          "maxItems": 50,
          "items": {
            "$ref": "#/$defs/Entry"
          }
        }
      },
      "required": [
        "results"
      ],
      "additionalProperties": false
    },
    "Conflicts": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "maxItems": 50,
          "items": {
            "$ref": "device-ownership.schema.json#/$defs/Evidence"
          }
        },
        "nextActionId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "items",
        "nextActionId"
      ],
      "additionalProperties": false
    }
  }
}

````
<!-- SOURCE-END contracts/sync.schema.json -->

## Original file: contracts/workday-closure.schema.json

SHA-256: `fd695fffc90989241c77157deaa758203c9d0b8d0b7cc5a90ac55f9e9cfb9c68` · Bytes: 23711.

<!-- SOURCE-BEGIN contracts/workday-closure.schema.json -->
````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/workday-closure.schema.json",
  "title": "Explicit round/workday closure and holder carry-forward v1",
  "$defs": {
    "Close": {
      "type": "object",
      "properties": {
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "expectedActiveRoundId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "expectedActivityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "expectedCurrentAttemptId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "currentAction": {
          "enum": [
            "require-none",
            "pause-heading"
          ]
        }
      },
      "required": [
        "workdayId",
        "roundId",
        "expectedActiveRoundId",
        "expectedActivityRevision",
        "expectedCurrentAttemptId",
        "currentAction"
      ],
      "additionalProperties": false,
      "description": "roundId anchors execution ownership. Day end without an active round must name the most recent round in that day. A heading needs explicit pause-heading; an arrived customer requires an outcome first. Unknown dependencies keep the action pending and are replayed with its original ID."
    },
    "EndRoundCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "round.end"
            },
            "payload": {
              "allOf": [
                {
                  "$ref": "#/$defs/Close"
                },
                {
                  "type": "object",
                  "properties": {
                    "expectedActiveRoundId": {
                      "$ref": "common.schema.json#/$defs/Uuid"
                    }
                  }
                }
              ]
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              },
              "required": [
                "kind"
              ]
            }
          }
        }
      ]
    },
    "EndDayCommand": {
      "allOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "const": "workday.end"
            },
            "payload": {
              "$ref": "#/$defs/Close"
            },
            "context": {
              "type": "object",
              "properties": {
                "kind": {
                  "const": "device"
                }
              },
              "required": [
                "kind"
              ]
            }
          }
        }
      ]
    },
    "Record": {
      "type": "object",
      "properties": {
        "closureId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "operationId": {
          "enum": [
            "round.end",
            "workday.end"
          ]
        },
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "ownerRoundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "endedRoundId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "roundEndedAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "workdayEndedAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "pausedActivity": {
          "anyOf": [
            {
              "$ref": "current-activity.schema.json#/$defs/Activity"
            },
            {
              "type": "null"
            }
          ]
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "time": {
          "$ref": "current-activity.schema.json#/$defs/ActionTime"
        }
      },
      "required": [
        "closureId",
        "operationId",
        "workdayId",
        "driverId",
        "ownerRoundId",
        "endedRoundId",
        "roundEndedAt",
        "workdayEndedAt",
        "pausedActivity",
        "activityRevision",
        "time"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "operationId": {
                "const": "round.end"
              }
            },
            "required": [
              "operationId"
            ]
          },
          "then": {
            "properties": {
              "endedRoundId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "roundEndedAt": {
                "$ref": "common.schema.json#/$defs/UtcInstant"
              },
              "workdayEndedAt": {
                "type": "null"
              }
            }
          },
          "else": {
            "properties": {
              "workdayEndedAt": {
                "$ref": "common.schema.json#/$defs/UtcInstant"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "endedRoundId": {
                "type": "null"
              }
            },
            "required": [
              "endedRoundId"
            ]
          },
          "then": {
            "properties": {
              "roundEndedAt": {
                "type": "null"
              }
            }
          },
          "else": {
            "properties": {
              "roundEndedAt": {
                "$ref": "common.schema.json#/$defs/UtcInstant"
              }
            }
          }
        }
      ]
    },
    "CommandResult": {
      "type": "object",
      "properties": {
        "disposition": {
          "enum": [
            "closed",
            "already-closed"
          ]
        },
        "closure": {
          "$ref": "#/$defs/Record"
        }
      },
      "required": [
        "disposition",
        "closure"
      ],
      "additionalProperties": false
    },
    "ActionResult": {
      "allOf": [
        {
          "$ref": "action-result.v1.schema.json"
        },
        {
          "type": "object",
          "properties": {
            "operationId": {
              "enum": [
                "round.end",
                "workday.end"
              ]
            }
          },
          "allOf": [
            {
              "if": {
                "type": "object",
                "properties": {
                  "receipt": {
                    "type": "object",
                    "properties": {
                      "businessStatus": {
                        "const": "accepted"
                      }
                    },
                    "required": [
                      "businessStatus"
                    ]
                  }
                },
                "required": [
                  "receipt"
                ]
              },
              "then": {
                "type": "object",
                "properties": {
                  "response": {
                    "type": "object",
                    "properties": {
                      "body": {
                        "$ref": "#/$defs/CommandResult"
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    },
    "ActionStatus": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "const": "pending"
            }
          },
          "required": [
            "actionId",
            "status"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "actionId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "status": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            },
            "result": {
              "$ref": "#/$defs/ActionResult"
            }
          },
          "required": [
            "actionId",
            "status",
            "result"
          ],
          "additionalProperties": false
        }
      ]
    },
    "SourceItem": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "sourceReference": {
          "$ref": "common.schema.json#/$defs/SourceReference"
        },
        "sourceDispatchCycleId": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "taskId",
        "dispatchCycleId",
        "sourceReference",
        "sourceDispatchCycleId"
      ],
      "additionalProperties": false
    },
    "Event": {
      "type": "object",
      "properties": {
        "closureId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "endedRoundId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "roundEndedAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "workdayEndedAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "time": {
          "$ref": "current-activity.schema.json#/$defs/ActionTime"
        },
        "tasks": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/SourceItem"
          }
        }
      },
      "required": [
        "closureId",
        "driverId",
        "workdayId",
        "endedRoundId",
        "roundEndedAt",
        "workdayEndedAt",
        "time",
        "tasks"
      ],
      "additionalProperties": false
    },
    "CarryItem": {
      "type": "object",
      "properties": {
        "taskId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "attemptId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "dispatchCycleId": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceReference": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/SourceReference"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceDispatchCycleId": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "assignmentRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "pinRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "earliestAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "deferred": {
          "type": "boolean"
        },
        "admittedInWorkday": {
          "type": "boolean"
        },
        "outcome": {
          "anyOf": [
            {
              "enum": [
                "full",
                "partial",
                "refused",
                "no-answer"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "disposition": {
          "enum": [
            "unfinished",
            "return-required",
            "unsuccessful"
          ]
        },
        "eligibleNow": {
          "type": "boolean"
        },
        "blocker": {
          "anyOf": [
            {
              "enum": [
                "result-required",
                "deferred",
                "earliest-time",
                "location-required",
                "receipt-or-disposition",
                "capacity-admission"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "heldReturnRequiredPieces": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "heldPieces": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "unpaidShippingMinor": {
          "type": "string",
          "pattern": "^[0-9]+$"
        }
      },
      "required": [
        "taskId",
        "attemptId",
        "dispatchCycleId",
        "sourceReference",
        "sourceDispatchCycleId",
        "sourceRevision",
        "assignmentRevision",
        "pinRevision",
        "earliestAt",
        "deferred",
        "admittedInWorkday",
        "outcome",
        "disposition",
        "eligibleNow",
        "blocker",
        "heldReturnRequiredPieces",
        "heldPieces",
        "unpaidShippingMinor"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "eligibleNow": {
                "const": true
              }
            },
            "required": [
              "eligibleNow"
            ]
          },
          "then": {
            "properties": {
              "blocker": {
                "type": "null"
              },
              "deferred": {
                "const": false
              },
              "outcome": {
                "type": "null"
              }
            }
          },
          "else": {
            "properties": {
              "blocker": {
                "type": "string"
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "sourceReference": {
                "type": "null"
              }
            },
            "required": [
              "sourceReference"
            ]
          },
          "then": {
            "properties": {
              "dispatchCycleId": {
                "type": "null"
              },
              "sourceDispatchCycleId": {
                "type": "null"
              },
              "heldPieces": {
                "type": "null"
              },
              "heldReturnRequiredPieces": {
                "const": 0
              }
            }
          },
          "else": {
            "properties": {
              "dispatchCycleId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "sourceDispatchCycleId": {
                "type": "string"
              },
              "heldPieces": {
                "type": "integer"
              }
            }
          }
        }
      ]
    },
    "CarryForward": {
      "type": "object",
      "properties": {
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "asOf": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/CarryItem"
          }
        }
      },
      "required": [
        "workdayId",
        "driverId",
        "asOf",
        "items"
      ],
      "additionalProperties": false
    },
    "RoundSummary": {
      "type": "object",
      "properties": {
        "roundId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "startedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "endedAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "firstPlanId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "firstForecastId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "firstWorkloadId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "activityRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991,
          "description": "Current retained activity revision, including a closure pause; use for explicit day end between rounds."
        }
      },
      "required": [
        "roundId",
        "startedAt",
        "endedAt",
        "firstPlanId",
        "firstForecastId",
        "firstWorkloadId"
      ],
      "additionalProperties": false
    },
    "Summary": {
      "type": "object",
      "properties": {
        "workdayId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "driverId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "displayTimeZone": {
          "const": "Africa/Cairo"
        },
        "openedAt": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "endedAt": {
          "anyOf": [
            {
              "$ref": "common.schema.json#/$defs/UtcInstant"
            },
            {
              "type": "null"
            }
          ]
        },
        "asOf": {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        "rounds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/RoundSummary"
          }
        },
        "scope": {
          "type": "object",
          "properties": {
            "shipments": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "attempts": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "processedAttempts": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "fullShipments": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "partialShipments": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "refusedShipments": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "noAnswerShipments": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "unfinishedShipments": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "shipments",
            "attempts",
            "processedAttempts",
            "fullShipments",
            "partialShipments",
            "refusedShipments",
            "noAnswerShipments",
            "unfinishedShipments"
          ],
          "additionalProperties": false
        },
        "collection": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "currency": {
                "const": "EGP"
              },
              "exponent": {
                "const": 2
              },
              "reportedMinor": {
                "type": "string",
                "pattern": "^[0-9]+$"
              },
              "unreportedAttempts": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              }
            },
            "required": [
              "currency",
              "exponent",
              "reportedMinor",
              "unreportedAttempts"
            ],
            "additionalProperties": false
          }
        },
        "outcomes": {
          "type": "array",
          "items": {
            "$ref": "outcomes.schema.json#/$defs/Record"
          }
        },
        "carryForward": {
          "$ref": "#/$defs/CarryForward"
        }
      },
      "required": [
        "workdayId",
        "driverId",
        "displayTimeZone",
        "openedAt",
        "endedAt",
        "asOf",
        "rounds",
        "scope",
        "collection",
        "outcomes",
        "carryForward"
      ],
      "additionalProperties": false,
      "description": "Workday admissions define distinct shipment and attempt denominators; each attempt is counted once across rounds. Outcomes are retained day-scoped history; shipment buckets use the latest outcome in this workday. Collections sum only amounts reported in this workday, never settlement. Carry-forward is a separately labelled current-holder read at asOf, not historical day inventory."
    }
  }
}

````
<!-- SOURCE-END contracts/workday-closure.schema.json -->

