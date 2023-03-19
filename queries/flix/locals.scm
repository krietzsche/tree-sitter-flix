(template_body) @local.scope
(lambda_expression) @local.scope


(function_declaration
      name: (identifier) @local.definition) @local.scope

(function_definition
      name: (identifier) @local.definition)

(parameter
  name: (identifier) @local.definition)

(binding
  name: (identifier) @local.definition)

(let_definition
  pattern: (identifier) @local.definition)

(identifier) @local.reference
