import EventEmitter from 'events';
import { Knex } from 'knex';
import { Logger, LogProvider } from '../logger';
import NotFoundError from '../error/notfound-error';
import { ICustomRole } from 'lib/types/model';
import {
    ICustomRoleInsert,
    ICustomRoleUpdate,
} from 'lib/types/stores/role-store';
import { IRole, IUserRole } from 'lib/types/stores/access-store';

const T = {
    ROLE_USER: 'role_user',
    ROLES: 'roles',
};

const COLUMNS = ['id', 'name', 'description', 'type'];

interface IRoleRow {
    id: number;
    name: string;
    description: string;
    type: string;
}

export default class RoleStore {
    private logger: Logger;

    private eventBus: EventEmitter;

    private db: Knex;

    constructor(db: Knex, eventBus: EventEmitter, getLogger: LogProvider) {
        this.db = db;
        this.eventBus = eventBus;
        this.logger = getLogger('lib/db/role-store.ts');
    }

    async getAll(): Promise<ICustomRole[]> {
        const rows = await this.db
            .select(COLUMNS)
            .from(T.ROLES)
            .orderBy('name', 'asc');

        return rows.map(this.mapRow);
    }

    async create(role: ICustomRoleInsert): Promise<ICustomRole> {
        const row = await this.db(T.ROLES)
            .insert({
                name: role.name,
                description: role.description,
                type: role.roleType,
            })
            .returning('*');
        return this.mapRow(row[0]);
    }

    async delete(id: number): Promise<void> {
        return this.db(T.ROLES).where({ id }).del();
    }

    async get(id: number): Promise<ICustomRole> {
        const rows = await this.db.select(COLUMNS).from(T.ROLES).where({ id });
        return this.mapRow(rows[0]);
    }

    async update(role: ICustomRoleUpdate): Promise<ICustomRole> {
        const rows = await this.db(T.ROLES)
            .where({
                id: role.id,
            })
            .update({
                id: role.id,
                name: role.name,
                description: role.description,
            })
            .returning('*');
        return this.mapRow(rows[0]);
    }

    async exists(id: number): Promise<boolean> {
        const result = await this.db.raw(
            `SELECT EXISTS (SELECT 1 FROM ${T.ROLES} WHERE id = ?) AS present`,
            [id],
        );
        const { present } = result.rows[0];
        return present;
    }

    async roleExists(name: string): Promise<boolean> {
        const result = await this.db.raw(
            `SELECT EXISTS (SELECT 1 FROM ${T.ROLES} WHERE name = ?) AS present`,
            [name],
        );
        const { present } = result.rows[0];
        return present;
    }

    async deleteAll(): Promise<void> {
        return this.db(T.ROLES).del();
    }

    mapRow(row: IRoleRow): ICustomRole {
        if (!row) {
            throw new NotFoundError('No row');
        }

        return {
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
        };
    }

    async getRoles(): Promise<IRole[]> {
        return this.db
            .select(['id', 'name', 'type', 'description'])
            .from<IRole>(T.ROLES);
    }

    async getRoleWithId(id: number): Promise<IRole> {
        return this.db
            .select(['id', 'name', 'type', 'description'])
            .where('id', id)
            .first()
            .from<IRole>(T.ROLES);
    }

    async getProjectRoles(): Promise<IRole[]> {
        return this.db
            .select(['id', 'name', 'type', 'description'])
            .from<IRole>(T.ROLES)
            .where('type', 'custom')
            .orWhere('type', 'project');
    }

    async getRolesForProject(projectId: string): Promise<IRole[]> {
        return this.db
            .select(['r.id', 'r.name', 'r.type', 'ru.project', 'r.description'])
            .from<IRole>(`${T.ROLE_USER} as ru`)
            .innerJoin(`${T.ROLES} as r`, 'ru.role_id', 'r.id')
            .where('project', projectId);
    }

    async getRootRoles(): Promise<IRole[]> {
        return this.db
            .select(['id', 'name', 'type', 'description'])
            .from<IRole>(T.ROLES)
            .where('type', 'root');
    }

    async removeRolesForProject(projectId: string): Promise<void> {
        return this.db(T.ROLE_USER)
            .where({
                project: projectId,
            })
            .delete();
    }

    async getRootRoleForAllUsers(): Promise<IUserRole[]> {
        const rows = await this.db
            .select('id', 'user_id')
            .distinctOn('user_id')
            .from(`${T.ROLES} AS r`)
            .leftJoin(`${T.ROLE_USER} AS ru`, 'r.id', 'ru.role_id')
            .where('r.type', '=', 'root');

        return rows.map((row) => ({
            roleId: +row.id,
            userId: +row.user_id,
        }));
    }

    async getRoleByName(name: string): Promise<IRole> {
        return this.db(T.ROLES).where({ name }).first();
    }

    destroy(): void {}
}

module.exports = RoleStore;
