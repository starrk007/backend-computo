import bcrypt from 'bcryptjs'
import { signAccessToken } from '../../config/jwt.js'
import { authRepository } from './auth.repository.js'
import { rolesRepository } from '../roles/roles.repository.js'

export class AuthService {
  async login(payload) {
    
    console.log("DATOS RECIBIDOS DEL FRONTEND:", payload);
    const { usuario, password } = payload

    const user = await authRepository.findByUsuario(usuario)

    if (!user) {
      const error = new Error('Credenciales inválidas')
      error.statusCode = 401
      throw error
    }

    if (user.activo === false) {
      const error = new Error('Usuario inactivo')
      error.statusCode = 403
      throw error
    }

    const passwordHash = user.passwordHash || user.password

    if (!passwordHash) {
      const error = new Error('El usuario no tiene contraseña configurada')
      error.statusCode = 500
      throw error
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash)

    if (!isValidPassword) {
      const error = new Error('Credenciales inválidas')
      error.statusCode = 401
      throw error
    }

    let resolvedPermissions = Array.isArray(user.permissions) ? user.permissions : []
    if (user.roleId) {
      try {
        const role = await rolesRepository.findById(user.roleId)
        const rolePermissions = Array.isArray(role?.permissions) ? role.permissions : []
        resolvedPermissions = Array.from(new Set([...resolvedPermissions, ...rolePermissions]))
      } catch (e) {
      }
    }

    const token = signAccessToken({
      sub: user.id,
      usuario: user.usuario,
      role: user.role || null,
      roleId: user.roleId || null,
      permissions: resolvedPermissions
    })

    return {
      token,
      user: this.sanitizeUser(user)
    }
  }

  async me(userId) {
    const user = await authRepository.findById(userId)

    if (!user) {
      const error = new Error('Usuario no encontrado')
      error.statusCode = 404
      throw error
    }

    if (user.activo === false) {
      const error = new Error('Usuario inactivo')
      error.statusCode = 403
      throw error
    }

    return this.sanitizeUser(user)
  }

  sanitizeUser(user) {
    return {
      id: user.id,
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      email: user.email || '',
      usuario: user.usuario || '',
      role: user.role || null,
      roleId: user.roleId || null,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      activo: user.activo ?? true
    }
  }
}

export const authService = new AuthService()