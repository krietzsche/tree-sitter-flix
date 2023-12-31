const PREC = {
  control: 1,
  qual_type_id: 2,
  lambda: 2,
  binding_decl: 2,
  while: 2,
  binding_def: 3,
  assign: 3,
  case: 3,
  qual_id: 4,
  unit: 4,
  ascription: 4,
  postfix: 5,
  colon_call: 5,
  infix: 6,
  constructor_app: 7,
  prefix: 7,
  call: 8,
  field: 8,
  binding: 10,
}

module.exports = grammar({
  name: 'flix',

  extras: $ => [
    /\s/,
    $.comment
  ],

  externals: $ => [
    $._automatic_semicolon,
    $._indent,
    $._interpolated_string_middle,
    $._interpolated_string_end,
    $._interpolated_multiline_string_middle,
    $._interpolated_multiline_string_end,
    $._outdent,
    $._simple_multiline_string,
    $._simple_string,
    'else',
    'catch',
    'finally',
    'with',
  ],

  inline: $ => [
    $._pattern,
    $._semicolon,
    $._definition,
    $._param_type,
    $._identifier,
    $.literal,
  ],

  conflicts: $ => [
    [$.tuple_type, $.parameter_types],
    [$.binding, $._simple_expression],
    [$.binding, $._type_identifier],
    [$.while_expression, $._simple_expression],
    [$._type_identifier, $.identifier],
    [$.instance_expression],
    [$.mod_definition]
  ],

  word: $ => $._alpha_identifier,

  rules: {
    compilation_unit: $ => repeat($._top_level_definition),

    _top_level_definition: $ => choice(
      $._definition,
    ),

    _definition: $ => choice(
      $.let_definition,
      $.mod_definition,
      $.enum_definition,
      $.type_definition,
      $.function_definition,
      $.class_definition,
      $.instance_definition,
      $.eff_definition,
      $.rel_definition,
      $.function_declaration,
      $.import_declaration,
      $.use_declaration,
    ),

    mod_definition: $ => seq(
      choice( 'mod', 'namespace'),
      field('name', $.mod_identifier),
      optional($._semicolon),
      field('body', optional($.template_body))
    ),

    mod_identifier: $ => prec.right(sep1(
      '.', $._identifier
    )),

    use_declaration: $ => prec.left(seq(
      'use',
      sep1(',', $._namespace_expression)
    )),

    import_declaration: $ => prec.left(seq(
      'import',
      optional('static'),
      $._type,
      optional(
        seq(
          '(',
          trailingCommaSep($._type),
          ')'
        )
      ),
      optional(seq(':', $._type)),
    )),

    _namespace_expression: $ => prec.left(seq(
      field('path', sep1(choice('.','/'), $.identifier)),
      optional(seq(
        '.',
        choice(
          $.namespace_wildcard,
          $.namespace_selectors,
        ),
      )),
    )),

    namespace_wildcard: $ => prec.left(1,
      choice('*', '_')
    ),

    namespace_selectors: $ => seq(
      '{',
        trailingCommaSep1(choice(
          $.namespace_wildcard,
          $.identifier,
        )),
      '}'
    ),

    // deprecated: Remove when highlight query is updated for Neovim
    _import_selectors: $ => alias($.namespace_selectors, $.import_selectors),

    enum_definition: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'enum',
      $._constructor_application,
      field('with', optional($.with_clause)),
      field('body', optional($.enum_body))
    )),

    enum_body: $ => choice(
      prec.left(
        PREC.control,
        seq(
          ':', 
          $._indent, 
          $._enum_block, 
          $._outdent
        )
      ),
      seq(
        '{',
        // TODO: self type
        optional($._enum_block),
        '}'
      )
    ),

    _enum_block: $ => prec.left(seq(
      sep1($._semicolon, choice(
        $.enum_case_definitions,
        $.expression,
        $._definition
      )),
      optional($._semicolon),
    )),

    enum_case_definitions: $ => commaSep1($.simple_enum_case),

    simple_enum_case: $ => seq(
      'case',
      field('name', $._pattern)
    ),

    class_definition: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'class',
      $._class_constructor,
      field('with', optional($.with_clause)),
      field('body', optional($.template_body))
    )),

    _class_constructor: $ => prec.right(seq(
      field('name', $._identifier),
      field('type_parameters', optional($.type_parameters)),
      optional($.annotation),
    )),

    instance_definition: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'instance',
      $._class_constructor,
      field('with', optional($.with_clause)),
      field('body', $.template_body)
    )),

    eff_definition: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'eff',
      $._type,
    )),

    rel_definition: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'rel',
      $.predicate_type,
    )),
    predicate_type: $ => seq(
      field('functor', $._type_constructor),
     '(',
      commaOrSemiSep($._predicate_arg_typed),
     ')'
    ),
    _predicate_arg_typed: $ => prec.left(PREC.control, seq(
      $.identifier,
      ':',
      $._type,
    )),

    type_parameters: $ => seq(
      '[',
      trailingCommaSep1($.type_parameter),
      ']'
    ),

    type_parameter: $ => seq(
      repeat($.annotation),
      $.type_parameter // invariant type parameter
    ),

    type_parameter: $ => seq(
      field('name', choice($.wildcard, $._identifier)),
      field('type_parameters', optional($.type_parameters)),
    ),

    template_body: $ => choice(
      prec.left(PREC.control, seq(
        ':',
        $._indent,
        $._block,
        $._outdent,
      )),
      prec.left(PREC.control, seq(
        '{',
        optional($._block),
        '}',
      )),
    ),

    /*
     * WithTemplateBody  ::=  <<< [SelfType] TemplateStat {semi TemplateStat} >>>
     */
    with_template_body: $ => prec.left(PREC.control, seq(
      $._indent,
      $._block,
      $._outdent,
    )),

    annotation: $ => prec.right(seq(
      '@',
      field('name', $._simple_type),
      field('arguments', repeat($.arguments)),
    )),

    _start_let: $ => seq(
      repeat($.annotation),
      optional($.modifiers),
      choice('let', 'forM'),
    ),

    let_definition: $ => prec(PREC.binding_def, seq(
      $._start_let,
      field('pattern', $._pattern),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._body_expression)
    )),

    type_definition: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'type',
      optional($.alias_modifier),
      $._type_constructor,
      optional(
        seq(
        '=',
        field('type', $._type))
      )
    )),

    // Created for memory-usage optimization during codegen.
    _type_constructor: $ => prec.left(seq(
      field('name', $._type_identifier),
      field('type_parameters', optional($.type_parameters)),
    )),

    function_definition: $ => seq(
      repeat($.annotation),
      optional($.modifiers),
      'def',
      $._function_constructor,
      seq('=', field('body', $._body_expression)),
    ),

    function_declaration: $ => prec.left(seq(
      repeat($.annotation),
      optional($.modifiers),
      'def',
      $._function_constructor,
    )),

    // Created for memory-usage optimization during codegen.
    _function_constructor: $ => prec.left(PREC.control, seq(
      field('name', $._identifier),
      field('type_parameters', optional($.type_parameters)),
      field('parameters', repeat($.parameters)),
      optional(seq(':', field('return_type', $._type))),
      field('with', optional($.with_clause)),
    )),

    alias_modifier: $ => 'alias',

    _constructor_application: $ => prec.left(PREC.constructor_app, choice(
      $._annotated_type,
      // This adds _simple_type, but not the above intentionall/y.
      seq(
        $._simple_type,
        field('arguments', $.arguments),
      ),
      seq(
        $._annotated_type,
        field('arguments', $.arguments),
      )
    )),

    _constructor_applications: $ => prec.left(choice(
      commaSep1($._constructor_application),
    )),

    modifiers: $ => repeat1(choice(
      'lazy',
      'lawful',
      'sealed',
      'override',
      'pub',
    )),

    /**
     * InheritClauses    ::=  ['extends' ConstrApps] ['derives' QualId {',' QualId}]
     */
    with_clause: $ => prec.left(seq(
      'with',
      field('type', $._constructor_applications),
      optional($.arguments)
    )),

    derives_clause: $ => seq(
      'derives',
      commaSep1(field('type', $._type_identifier))
    ),

    parameters: $ => seq(
      '(',
      trailingCommaSep($.parameter),
      ')'
    ),

    parameter: $ => seq(
      repeat($.annotation),
      field('name', $._identifier),
      optional(seq(':', field('type', $._param_type))),
      optional(seq('=', field('default_value', $.expression)))
    ),

    _body_expression: $ => prec.left(PREC.control, choice(
      $.block,
      $._block,
      //$.indented_block,
      //$.indented_cases,
    )),

    block: $ => seq(
      '{',
      optional($._block),
      '}'
    ),
    _block: $ => prec.left(seq(
      sep1($._semicolon, choice(
        $.expression,
        $._definition,
      )),
      optional($._semicolon),
    )),

    rel_block: $ => seq(
      '#{',
      optional($._rel_block),
      '}'
    ),

    _rel_block: $ => prec.left(seq(
      repeat1( $.rel_clause ),
    )),

    indented_block: $ => prec.left(PREC.control, seq(
      $._indent,
      $._block,
      $._outdent,
    )),

    indented_cases: $ => prec.left(PREC.control, seq(
      $._indent,
      repeat1($.case_clause),
      $._outdent,
    )),

    // ---------------------------------------------------------------
    // Types

    _type: $ => choice(
      $.native_type,
      $.function_type,
      $.infix_type,
      $.effect_type,
      $._annotated_type,
      $.literal_type,
      $.record_type,
      $.rel_record_type,
      alias($.template_body, $.structural_type)
    ),
    native_type: $ => seq(
      '##', 
      $.identifier
    ),
    _annotated_type: $ => prec.right(seq(
      $._simple_type,
      repeat($.annotation),
    )),
    _simple_type: $ => choice(
      $.generic_type,
      $.tuple_type,
      $.singleton_type,
      $.qual_type_identifier,
      $._type_identifier,
      $.wildcard,
    ),
    effect_type: $ => prec.left(PREC.postfix, seq(
      field('left', $._type),
      '\\',
      field('right', $._type)
    )),
    infix_type: $ => prec.left(PREC.infix, seq(
      field('left', choice($.infix_type, $._annotated_type)),
      field('operator', $._identifier),
      field('right', choice($.infix_type, $._annotated_type))
    )),
    record_type: $ => seq(
      '{', 
      trailingCommaSep1($._record_arg_typed),
      optional( seq('|', $.identifier)),
      '}'
    ),
    _record_arg_typed: $ => prec.left(PREC.control, seq(
      $.identifier,
      '=',
      $._type,
    )),
    rel_record_type: $ => seq(
      '#{',
      trailingCommaSep($._type),
      optional( seq('|', $.identifier)),
      '}'
    ),

    tuple_type: $ => seq(
      '(',
      trailingCommaSep1($._type),
      ')',
    ),

    singleton_type: $ => prec.left(PREC.qual_type_id, seq(
      choice($._identifier, $.qual_identifier),
      '.',
      'type',
    )),

    qual_type_identifier: $ => prec.left(PREC.qual_type_id, seq(
      choice($._identifier, $.qual_identifier),
      '.',
      $._type_identifier
    )),

    qual_identifier: $ => prec.left(PREC.qual_id, seq(
      choice($._identifier, $.qual_identifier),
      '.',
      $._identifier
    )),

    generic_type: $ => seq(
      field('type', $._simple_type),
      field('type_arguments', $.type_arguments)
    ),

    function_type: $ => prec.right(seq(
      field('parameter_types', $.parameter_types),
      '->',
      field('return_type', $._type)
    )),

    // Deprioritize against typed_pattern._type.
    parameter_types: $ => prec(-1, choice(
      $._annotated_type,
      // Prioritize a parenthesized param list over a single tuple_type.
      prec.dynamic(1, seq('(', trailingCommaSep($._param_type), ')' )),
      $.infix_type,
    )),

    _param_type: $ => choice(
      $._type,
      $.lazy_parameter_type
    ),

    lazy_parameter_type: $ => seq(
      '=>',
      field('type', $._type)
    ),

    _type_identifier: $ => alias($._identifier, $.type_identifier),

    // ---------------------------------------------------------------
    // Patterns

    _pattern: $ => choice(
      $._identifier,
      $.qual_identifier,
      $.interpolated_string_expression,
      $.capture_pattern,
      $.tuple_pattern,
      $.record_pattern,
      $.enum_pattern,
      $.infix_pattern,
      $.alternative_pattern,
      $.typed_pattern,
      $.literal,
      $.wildcard
    ),

    enum_pattern: $ => seq(
      field('type', choice($._type_identifier, $.qual_type_identifier)),
      '(',
      field('pattern', trailingCommaSep($._type)),
      ')'
    ),

    infix_pattern: $ => prec.left(PREC.infix, seq(
      field('left', $._pattern),
      field('operator', $._identifier),
      field('right', $._pattern),
    )),

    capture_pattern: $ => prec(PREC.field, seq(
      field('name', $._identifier),
      '@',
      field('pattern', $._pattern)
    )),

    typed_pattern: $ => prec.right(seq(
      field('pattern', $._pattern),
      ':',
      field('type', $._type)
    )),

    // TODO: Flatten this.
    alternative_pattern: $ => prec.left(-1, seq(
      $._pattern,
      '|',
      $._pattern
    )),
    tuple_pattern: $ => seq(
      '(',
      trailingCommaSep1($._pattern),
      ')'
    ),
    record_pattern: $ => seq(
      '{', 
      trailingCommaSep1($._record_field),
      '}'
    ),
    _record_field: $ => prec.left(PREC.control, seq(
      $.identifier,
      '=',
      $.expression,
    )),
    // ---------------------------------------------------------------
    // Expressions

    rel_clause: $ => seq(
      field('head',$.rel_fact),
      optional(field('body',$.rel_body)),
      $.dot
    ),
    rel_fact: $ => seq(
      optional( choice( 'not', 'fix' )),
      field('functor', $.identifier),
     '(',
      commaOrSemiSep($.atom),
     ')'
    ),
    rel_body: $ => seq(
      ':-',
      trailingCommaSep($.rel_fact)
    ),
    atom: $ => choice(
      $.identifier,
      $.string,
      $.interpolated_string,
    ),
    expression: $ => choice(
      $.block,
      $.case_block,
      $.rel_block,
      $.if_expression,
      $.try_expression,
      $.assignment_expression,
      $.lambda_expression,
      $.postfix_expression,
      $.infix_expression,
      $.prefix_expression,
      $.return_expression,
      $.throw_expression,
      $.while_expression,
      $.for_expression,
      $._simple_expression,
      $.do_expression,
      $.match_expression,
      $.region_expression,
      $.query_expression,
    ),

    _simple_expression: $ => choice(
      $.identifier,
      $.operator_identifier,
      $.literal,
      $.interpolated_string_expression,
      $.unit,
      $.tuple_expression,
      $.wildcard,
      $.instance_expression,
      $.parenthesized_expression,
      $.field_expression,
      $.lazy_expression,
      $.generic_function,
      $.call_expression,
    ),

    lambda_expression: $ => prec.right(PREC.lambda, seq(
      field('parameters', choice(
        $.bindings,
        $._identifier,
        $.wildcard,
      )),
      '->',
      $._block,
    )),

    if_expression: $ => prec.right(PREC.control, seq(
      'if',
      field('condition', $.parenthesized_expression),
      field('consequence', $._body_expression),
      optional(seq(
        'else',
        field('alternative', $._body_expression),
      )),
    )),

    /*
     *   MatchClause       ::=  'match' <<< CaseClauses >>>
     */
    match_expression: $ => prec.right(PREC.control, seq(
      'match',
      field('value', $.expression),
      field('body', $._body_expression)
    )),

    do_expression: $ => prec.right(PREC.control, seq(
      'do',
      field('body', $._body_expression)
    )),

    region_expression: $ => prec.right(PREC.control, seq(
      'region',
      field('value', $.identifier),
      field('body', $._body_expression)
    )),

    query_expression: $ => prec.right(PREC.control, seq(
      'query',
      commaSep($.expression),
      'select',
      $.expression,
      'from',
      $.expression
    )),

    try_expression: $ => prec.right(PREC.control, seq(
      'try',
      field('body', $._body_expression),
      optional($.catch_clause),
      optional($.finally_clause)
    )),

    /*
     *   Catches           ::=  'catch' (Expr | ExprCaseClause)
     */
    catch_clause: $ => prec.right(seq('catch', $._body_expression)),

    finally_clause: $ => prec.right(seq('finally', $._body_expression)),

    binding: $ => prec.dynamic(PREC.binding, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $._param_type))),
    )),

    bindings: $ => seq(
      '(',
      trailingCommaSep($.binding),
      ')',
    ),

    case_block: $ => choice(
      prec(-1, seq('{', '}')),
      seq('{', repeat1($.case_clause), '}'),
    ),

    case_clause: $ => prec.left(PREC.control, seq(
      'case',
      $._case_pattern,
      field('body', optional($._block)),
    )),

    // This is created to capture guard from the right
    _case_pattern: $ => prec.right(10, seq(
      field('pattern', $._pattern),
      optional($.guard),
      '=>',
    )),

    guard: $ => prec.left(PREC.control, seq(
      'if',
      field('condition', $._postfix_expression_choice)
    )),

    assignment_expression: $ => prec.right(PREC.assign, seq(
      field('left', choice(
        $.prefix_expression,
        $._simple_expression,
      )),
      choice('=',':='),
      field('right', $.expression)
    )),

    generic_function: $ => prec(PREC.call, seq(
      field('function', $.expression),
      field('type_arguments', $.type_arguments)
    )),

    call_expression: $ => choice(
      prec.left(PREC.call, seq(
        field('function', $._simple_expression),
        field('arguments', choice(
          $.arguments,
          $.case_block,
          $.block,
        )),
      )),
      prec.right(PREC.colon_call, seq(
        field('function', $._postfix_expression_choice),
        ':',
        field('arguments', $.colon_argument),
      )),
    ),

    /**
     *   ColonArgument     ::=  colon [LambdaStart]
     *                          (CaseClauses | Block)
     */
    colon_argument: $ => prec.left(PREC.colon_call, seq(
      optional(field('lambda_start', seq(
        choice(
          $.bindings,
          $._identifier,
          $.wildcard,
        ),
        '=>',
      ))),
      $.block
    )),

    field_expression: $ => prec.left(PREC.field, seq(
      field('value', $._simple_expression),
      '.',
      field('field', $._identifier)
    )),

    lazy_expression: $ => prec.left(PREC.field, seq(
      'lazy',
      field('value', $._simple_expression),
    )),

    instance_expression: $ => choice(
      prec.dynamic(0, seq(
        'new',
        $._constructor_application,
        $.template_body,
      )),
      seq(
        'new',
        $.template_body,
      ),
      seq(
        'new',
        $._constructor_application,
      ),
    ),

    /**
     * PostfixExpr [Ascription]
     */
    ascription_expression: $ => prec.dynamic(PREC.ascription, seq(
        $._postfix_expression_choice,
        ':',
        choice(
          $._param_type,
          $.annotation,
        ),
    )),

    infix_expression: $ => prec.left(PREC.infix, seq(
      field('left', choice(
        $.infix_expression,
        $.prefix_expression,
        $._simple_expression,
      )),
      field('operator', $._identifier),
      field('right', choice(
        $.prefix_expression,
        $._simple_expression,
        seq(
          ':',
          $.colon_argument,
        ),
      )),
    )),

    /**
     * PostfixExpr       ::=  InfixExpr [id]
     */
    postfix_expression: $ => prec.left(PREC.postfix, seq(
      choice(
        $.infix_expression,
        $.prefix_expression,
        $._simple_expression,
      ),
      $._identifier,
    )),

    _postfix_expression_choice: $ => prec.left(PREC.postfix, choice(
      $.postfix_expression,
      $.infix_expression,
      $.prefix_expression,
      $._simple_expression,
    )),

    /**
     * PrefixExpr        ::=  [PrefixOperator] SimpleExpr
     */
    prefix_expression: $ => prec(PREC.prefix, seq(
      choice('+', '-', '!', '~'),
      $._simple_expression,
    )),

    tuple_expression: $ => seq(
      '(',
      $.expression,
      repeat1(seq(',', $.expression)),
      optional(','),
      ')'
    ),

    parenthesized_expression: $ => seq(
      '(',
      $.expression,
      ')'
    ),

    type_arguments: $ => seq(
      '[',
      trailingCommaSep1($._type),
      ']'
    ),

    arguments: $ => seq(
      '(',
      trailingCommaSep($.expression),
      ')'
    ),

    symbol_literal: $ => '__no_longer_used_symbol_literal_',

    /**
     * id               ::=  plainid
     *                       |  ‘`’ { charNoBackQuoteOrNewline | UnicodeEscape | charEscapeSeq 
     */
    identifier: $ => prec.left(choice(
      $._alpha_identifier,
      $._backquoted_id,
    )),

    /**
     * alphaid          ::=  upper idrest
     *                       |  varid
     * We approximate the above as:
     * /[A-Za-z\$_][A-Z\$_a-z0-9]*(_[\-!#%&*+\/\\:<=>?@\u005e\u007c~]+)?/,
     *
     */
    _alpha_identifier: $ => /[\p{Lu}\p{Lt}\p{Nl}\p{Lo}\p{Lm}\$\p{Ll}_\u00AA\u00BB\u02B0-\u02B8\u02C0-\u02C1\u02E0-\u02E4\u037A\u1D78\u1D9B-\u1DBF\u2071\u207F\u2090-\u209C\u2C7C-\u2C7D\uA69C-\uA69D\uA770\uA7F8-\uA7F9\uAB5C-\uAB5F\$][\p{Lu}\p{Lt}\p{Nl}\p{Lo}\p{Lm}\$\p{Ll}_\u00AA\u00BB\u02B0-\u02B8\u02C0-\u02C1\u02E0-\u02E4\u037A\u1D78\u1D9B-\u1DBF\u2071\u207F\u2090-\u209C\u2C7C-\u2C7D\uA69C-\uA69D\uA770\uA7F8-\uA7F9\uAB5C-\uAB5F0-9\$_\p{Ll}]*(_[\-!#%&*+\/\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]+)?/,

    _backquoted_id: $=> /`[^\n`]+`/,

    _identifier: $ => choice($.identifier, $.operator_identifier),

    wildcard: $ => '_',

    /**
     * Regex patterns created to avoid matching // comments.
     * This could technically match illeagal tokens such as val ?// = 1
     */
    operator_identifier: $ => token(choice(
      // single opchar
      /[\-!#%&*+\/\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]/,
      seq(
        // opchar minus slash
        /[\-!#%&*+\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]/,
        // opchar*
        repeat1(/[\-!#%&*+\/\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]/),
      ),
      seq(
        // opchar
        /[\-!#%&*+\/\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]/,
        // opchar minus slash
        /[\-!#%&*+\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]/,
        // opchar*
        repeat(/[\-!#%&*+\/\\:<=>?@\u005e\u007c~\p{Sm}\p{So}]/),
      ),
    )),

    _non_null_literal: $ => 
      choice(
        $.integer_literal,
        $.floating_point_literal,
        $.boolean_literal,
        $.character_literal,
        $.string
      ),

    literal_type: $ => $._non_null_literal,

    literal: $ => choice(
      $._non_null_literal,
      $.null_literal
    ),

    integer_literal: $ => token(
      seq(
        optional(/[-]/),
        choice(
          /[\d](_?\d)*/,
          /0[xX][\da-fA-F](_?[\da-fA-F])*/
        ),
        optional(/[lL]/)
      )
    ),

    floating_point_literal: $ => token(
      seq(
        optional(/[-]/),
        choice(
          // digit {digit} ‘.’ digit {digit} [exponentPart] [floatType]
          seq(
            /[\d]+\.[\d]+/,
            optional(/[eE][+-]?[\d]+/),
            optional(/[dfDF]/)
          ),
          // ‘.’ digit {digit} [exponentPart] [floatType]
          seq(
            /\.[\d]+/,
            optional(/[eE][+-]?[\d]+/),
            optional(/[dfDF]/)
          ),
          // digit {digit} exponentPart [floatType]
          seq(
            /[\d]+/,
            /[eE][+-]?[\d]+/,
            optional(/[dfDF]/)
          ),
          // digit {digit} [exponentPart] floatType
          seq(
            /[\d]+/,
            optional(/[eE][+-]?[\d]+/),
            /[dfDF]/
          )
        )
      )
    ),

    boolean_literal: $ => choice('true', 'false'),

    character_literal: $ => token(seq(
      '\'',
      optional(choice(
        seq('\\', choice(
          /[^xu]/,
          /u[0-9a-fA-F]{4}/,
          /u{[0-9a-fA-F]+}/,
          /x[0-9a-fA-F]{2}/
        )),
        /[^\\'\n]/
      )),
      '\''
    )),

    interpolated_string_expression: $ => seq(
      field('interpolator', $.identifier),
      $.interpolated_string
    ),

    _interpolated_string_start: $ => '"',

    _interpolated_multiline_string_start: $ => '"""',

    interpolation: $ => seq('$', choice($.identifier, $.block)),

    interpolated_string: $ => choice(
      seq(
        $._interpolated_string_start,
        repeat(seq(
          $._interpolated_string_middle,
          $.interpolation
        )),
        $._interpolated_string_end
      ),
      seq(
        $._interpolated_multiline_string_start,
        repeat(seq(
          $._interpolated_multiline_string_middle,
          $.interpolation
        )),
        $._interpolated_multiline_string_end
      )
    ),

    string: $ =>
      choice(
        $._simple_string,
        $._simple_multiline_string
      ),

    _semicolon: $ => choice(
      ';',
      $._automatic_semicolon
    ),

    comma: $ => ',',
    dot: $ => '.',

    null_literal: $ => 'null',

    unit: $ => prec(PREC.unit, seq('(', ')')),

    return_expression: $ => prec.left(seq('return', optional($.expression))),

    throw_expression: $ => prec.left(seq('throw', $.expression)),

    /*
     *   Expr1             ::=  'while' '(' Expr ')' {nl} Expr
     *                       |  'while' Expr 'do' Expr
     */
    while_expression: $ => prec(PREC.while, choice(
      prec.right(seq(
        'while',
        field('condition', $.parenthesized_expression),
        field('body', $.expression)
      )),
      prec.right(seq(
        'while',
        field('condition', seq($._body_expression, 'do')),
        field('body', $._body_expression)
      )),
    )),


    for_expression: $ => choice( $.foreach_expression, $.foreach_yield_expression),
    
    foreach_expression: $ => 
      prec.right(PREC.control, seq(
        choice('foreach'),
        field('enumerators', $.enumerators),
        field('body', $._body_expression),
      )),

    foreach_yield_expression: $ => 
      prec.right(PREC.control, seq(
        choice('foreach', 'forA', 'forM', 'par'),
        field('enumerators', $.enumerators),
        seq('yield', field('body', $._body_expression)),
      )),

    enumerators: $ => choice(
      seq(
        '(',
        sep1($._semicolon, $.enumerator),
        optional($._automatic_semicolon),
        ')'
      ),
      seq(
        $._indent,
        sep1($._semicolon, $.enumerator),
        optional($._automatic_semicolon),
        $._outdent,
      ),
    ),

    enumerator: $ => choice(
      seq(
        optional('case'),
        $._pattern,
        choice('<-', '='),
        $.expression,
        optional($.guard)
      ),
      repeat1($.guard),
    ),

    comment: $ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/'
      )
    ))
  }
})

function commaOrSemiSep(rule) {
  return optional(commaOrSemiSep1(rule))
}

function commaOrSemiSep1(rule) {
  return sep1(choice(',',';'), rule)
}

function commaSep(rule) {
  return optional(commaSep1(rule))
}

function commaSep1(rule) {
  return sep1(',', rule)
}

function trailingCommaSep(rule) {
  return optional(trailingCommaSep1(rule))
}

function trailingCommaSep1(rule) {
  return trailingSep1(',', rule)
}

function trailingSep1(delimiter, rule) {
  return seq(sep1(delimiter, rule), optional(delimiter))
}

function sep1(delimiter, rule) {
  return seq(rule, repeat(seq(delimiter, rule)))
}
