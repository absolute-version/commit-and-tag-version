import { JSONSchema7TypeName } from 'json-schema';
import { Config } from "conventional-changelog-config-spec";
import specSchema from "conventional-changelog-config-spec/versions/2.1.0/schema.json";

interface SpecProperty<T> {
  type: JSONSchema7TypeName;
  default: T;
  description: string;
}

interface SpecProperties {
  header: SpecProperty<string>;
  types: SpecProperty<Config.Type[]>
  preMajor: SpecProperty<boolean>;
  commitUrlFormat: SpecProperty<string>;
  compareUrlFormat: SpecProperty<string>;
  issueUrlFormat: SpecProperty<string>;
  userUrlFormat: SpecProperty<string>;
  releaseCommitMessageFormat: SpecProperty<string>;
  issuePrefixes: SpecProperty<string[]>;
}

const spec = specSchema.properties as any as SpecProperties;

export default spec;
