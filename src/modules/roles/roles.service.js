import { rolesRepository } from './roles.repository.js'
import { logAuditEvent } from '../../utils/audit.js'

export class RolesService {
  async list(query) {
    const {
      q = '',
      page = 1,
      limit = 10
    } = query

    const allRoles = await rolesRepository.findAll()

    let filtered = allRoles

    if (q) {
      const term = q.trim().toLowerCase()

      filtered = filtered.filter((role) => {
        return (
          String(role.nombre || '').toLowerCase().includes(term) ||
          String(role.descripcion || '').toLowerCase().includes(term)
        )
      })
    }

    filtered.sort((a, b) => {
      const aName = String(a.nombre || '').toLowerCase()
      const bName = String(b.nombre || '').toLowerCase()
      return aName.localeCompare(bName)
    })

    const total = filtered.length
    const start = (page - 1) * limit
    const end = start + limit
    const items = filtered.slice(start, end).map((role) => this.sanitizeRole(role))

    return {
      items,
      total,
      page,
      limit
    }
  }

  async getById(id) {
    const role = await rolesRepository.findById(id)

    if (!role) {
      const error = new Error('Rol no encontrado')
      error.statusCode = 404
      throw error
    }

    return this.sanitizeRole(role)
  }

  async create(payload, currentUser = null) {
    const existing = await rolesRepository.findByNombre(payload.nombre)

    if (existing) {
      const error = new Error('El rol ya existe')
      error.statusCode = 409
      throw error
    }

    if (payload.id) {
      const existingById = await rolesRepository.findById(payload.id)
      if (existingById) {
        const error = new Error('El identificador del rol ya existe')
        error.statusCode = 409
        throw error
      }
    }

    const data = {
      ...(payload.id ? { id: payload.id } : {}),
      nombre: payload.nombre,
      descripcion: payload.descripcion || '',
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const created = await rolesRepository.create(data)
    const sanitized = this.sanitizeRole(created)

    await logAuditEvent({
      action: 'CREATE',
      resource: 'roles',
      resourceId: created.id,
      details: {
        nombre: sanitized.nombre,
        permissionsCount: sanitized.permissions.length
      },
      currentUser
    })

    return sanitized
  }

  async update(id, payload, currentUser = null) {
    const currentRole = await rolesRepository.findById(id)

    if (!currentRole) {
      const error = new Error('Rol no encontrado')
      error.statusCode = 404
      throw error
    }

    if (payload.nombre && payload.nombre !== currentRole.nombre) {
      const existing = await rolesRepository.findByNombre(payload.nombre)

      if (existing && existing.id !== id) {
        const error = new Error('El rol ya existe')
        error.statusCode = 409
        throw error
      }
    }

    const data = {
      updatedAt: new Date().toISOString()
    }

    if (payload.nombre !== undefined) data.nombre = payload.nombre
    if (payload.descripcion !== undefined) data.descripcion = payload.descripcion
    if (payload.permissions !== undefined) data.permissions = payload.permissions

    const updated = await rolesRepository.update(id, data)
    const sanitized = this.sanitizeRole(updated)

    await logAuditEvent({
      action: 'UPDATE',
      resource: 'roles',
      resourceId: updated.id,
      details: {
        changes: Object.keys(payload),
        nombre: sanitized.nombre,
        permissionsCount: sanitized.permissions.length
      },
      currentUser
    })

    return sanitized
  }

  async remove(id, currentUser = null) {
    const currentRole = await rolesRepository.findById(id)

    if (!currentRole) {
      const error = new Error('Rol no encontrado')
      error.statusCode = 404
      throw error
    }

    await rolesRepository.remove(id)

    await logAuditEvent({
      action: 'DELETE',
      resource: 'roles',
      resourceId: id,
      details: {
        nombre: currentRole.nombre || ''
      },
      currentUser
    })

    return {
      success: true
    }
  }

  sanitizeRole(role) {
    return {
      id: role.id,
      nombre: role.nombre || '',
      descripcion: role.descripcion || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      createdAt: role.createdAt || null,
      updatedAt: role.updatedAt || null
    }
  }
}

export const rolesService = new RolesService()