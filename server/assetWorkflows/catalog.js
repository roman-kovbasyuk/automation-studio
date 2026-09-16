export const capabilityCatalog = Object.freeze(
  [
    ['input', 'Input', 'Read explicit fixture input'],
    ['context', 'Context', 'Resolve declared bindings'],
    [
      'ai',
      'AI instructions',
      'Use explicit fixture output; no provider is called',
    ],
    [
      'clarification',
      'Clarification',
      'Ask saved required questions that have no answer',
    ],
    ['condition', 'Condition', 'Choose exactly one true/false branch'],
    [
      'render',
      'Render simulation',
      'Use explicit fixture output; no file is created',
    ],
    ['output', 'Output', 'Declare the simulated result'],
  ].map(([key, title, description]) =>
    Object.freeze({
      key,
      version: 1,
      title,
      description,
      availability: 'simulation_only',
      liveEnabled: false,
      inputContract: {
        input: [],
        context: ['*'],
        ai: ['context', 'answers'],
        clarification: [],
        condition: [],
        render: ['plan'],
        output: ['*'],
      }[key],
      requiredBindings: { render: ['plan'] }[key] ?? [],
      outputContract:
        key === 'clarification'
          ? 'question_fields'
          : key === 'condition'
            ? 'boolean'
            : key === 'input'
              ? 'fixture_json'
              : 'declared_json_fields',
    }),
  ),
)
