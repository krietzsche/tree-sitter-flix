; CREDITS @stumash (stuart.mashaal@gmail.com)

(class_definition
  name: (identifier) @type)

(enum_definition
  name: (identifier) @type)

(instance_definition
  name: (identifier) @type)

(simple_enum_case
  name: (identifier) @type)

;; variables

(interpolation (identifier) @none)
(interpolation (block) @none)

;; types

(type_definition
  name: (type_identifier) @type.definition)
(type_identifier) @type
(type_parameter) @type

(qual_identifier) @type
(qual_type_identifier) @type

;; mod

(mod_identifier) @identifier

;; let definitions/declarations

(let_definition
  pattern: (identifier) @variable)

; method definition

(function_declaration
      name: (identifier) @method)

(function_definition
      name: (identifier) @method)

; imports

; method invocation

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (operator_identifier) @function.call)

(call_expression
  function: (field_expression
    field: (identifier) @method.call))

((call_expression
   function: (identifier) @constructor)
 (#lua-match? @constructor "^[A-Z]"))

(generic_function
  function: (expression) @type_arguments)

(interpolated_string_expression
  interpolator: (identifier) @function.call)

; function definitions

(function_definition
  name: (identifier) @function)

(parameter
  name: (identifier) @parameter)

(binding
  name: (identifier) @parameter)

; expressions

(field_expression field: (identifier) @property)

(infix_expression operator: (identifier) @operator)
(infix_expression operator: (operator_identifier) @operator)
(infix_type operator: (operator_identifier) @operator)
(infix_type operator: (operator_identifier) @operator)

; literals

(boolean_literal) @boolean
(integer_literal) @number
(floating_point_literal) @float

[
  (symbol_literal)
  (string)
  (character_literal)
  (interpolated_string_expression)
] @string

(interpolation "$" @punctuation.special)

;; keywords

[
  "case"
  "class"
  "enum"
  "finally"
  "from"
  "instance"
  "let"
  "mod"
  "namespace"
  "query"
  "region"
  "eff"
  "rel"
  "select"
  "type"
  "use"
  "with"
] @keyword

[
  "lazy"
  "lawful"
  "sealed"
  "override"
  "static"
  "pub"
] @type.qualifier

(null_literal) @constant.builtin

(wildcard) @parameter

(annotation) @attribute

;; special keywords

"new" @keyword.operator
(alias_modifier) @keyword

[
  "else"
  "if"
  "match"
] @conditional

[
 "("
 ")"
 "["
 "]"
 "{"
 "}"
]  @punctuation.bracket

[
 "."
 ","
 ";"
] @punctuation.delimiter

[
  "do"
  "while"
  "foreach"
  "forA"
  "forM"
  "par"
  "yield"
] @repeat

"def" @keyword.function

[
 "=>"
 "->"
 "<-"
 "\\"
 "@"
] @operator

["import" "use"] @include

[
  "try"
  "catch"
  "throw"
] @exception

"return" @keyword.return

(comment) @comment @spell

;; `case` is a conditional keyword in case_block

(case_block
  (case_clause ("case") @conditional))

(operator_identifier) @operator

((identifier) @variable.builtin
 (#lua-match? @variable.builtin "^this$"))

(
  (identifier) @function.builtin
  (#lua-match? @function.builtin "^super$")
)
