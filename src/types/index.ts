export interface KeysScope {
  value: string;
  shouldTranslate: boolean;
}

export interface MCPStringData {
  key: string;
  value: string;
  shouldTranslate: boolean;
  scopeValue: string;
}

export interface BulkStringKeyValue {
  key: string;
  value: string;
}

export interface MCPBulkStringData {
  keys: BulkStringKeyValue[];
  shouldTranslate: boolean;
  scopeValue: string;
} 