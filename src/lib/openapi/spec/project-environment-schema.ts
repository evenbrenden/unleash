import { FromSchema } from 'json-schema-to-ts';

export const projectEnvironmentSchema = {
    $id: '#/components/schemas/projectEnvironmentSchema',
    type: 'object',
    description:
        'Add an environment to a project, optionally also sets if change requests are enabled for this environment on the project',
    required: ['environment'],
    properties: {
        environment: {
            type: 'string',
            description: 'The environment to add to the project',
            example: 'development',
        },
        changeRequestsEnabled: {
            type: 'boolean',
            nullable: true,
            description:
                'Should change requests be enabled or not for this environment on the project',
            example: true,
        },
    },
    components: {},
} as const;

export type ProjectEnvironmentSchema = FromSchema<
    typeof projectEnvironmentSchema
>;
