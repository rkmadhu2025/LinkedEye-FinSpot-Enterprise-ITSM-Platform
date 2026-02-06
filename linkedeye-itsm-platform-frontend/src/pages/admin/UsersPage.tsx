/**
 * Premium User Management Console
 * 
 * A sophisticated administrative interface for managing organizational identities.
 * Features:
 * - Glassmorphic design with smooth animations
 * - Advanced filtering and search
 * - Bulk operations with visual feedback
 * - Responsive grid/table layout
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
   Plus, Search, Mail, Shield, Edit, Trash2, X, Users, CheckCircle,
   XCircle, Clock, Key, FileUp, UserPlus, ChevronLeft, ChevronRight,
   UserCheck, UserX, Send, MoreHorizontal, Target, Fingerprint, Activity, RefreshCw,
   Download, Upload, Filter, Grid, List, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Button, Input, Select, Avatar, StatusBadge, Modal, Spinner } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { userService } from '@/services/userService';
import { User, Role, CreateUserData } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const UsersPage = () => {
   const { theme } = useAppSelector( ( state: any ) => state.ui );
   const isDark = theme === 'dark';
   const [users, setUsers] = useState<User[]>( [] );
   const [roles, setRoles] = useState<Role[]>( [] );
   const [isLoading, setIsLoading] = useState( true );
   const [searchQuery, setSearchQuery] = useState( '' );
   const [roleFilter, setRoleFilter] = useState( '' );
   const [statusFilter, setStatusFilter] = useState( '' );
   const [editingUser, setEditingUser] = useState<User | null>( null );
   const [isEditModalOpen, setIsEditModalOpen] = useState( false );
   const [isCreateModalOpen, setIsCreateModalOpen] = useState( false );
   const [isSaving, setIsSaving] = useState( false );
   const [selectedUsers, setSelectedUsers] = useState<string[]>( [] );
   const [currentPage, setCurrentPage] = useState( 1 );
   const [viewMode, setViewMode] = useState<'grid' | 'table'>( 'table' );
   const itemsPerPage = 12;

   const [newUser, setNewUser] = useState<CreateUserData>( {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      role: 'user',
      department: '',
      job_title: '',
      phone: '',
   } );

   const fetchUsers = useCallback( async () => {
      try {
         setIsLoading( true );
         const response = await userService.getUsers( 1, 100, searchQuery || undefined );
         setUsers( response.data );
      } catch ( error ) {
         console.error( 'Failed to fetch users:', error );
         toast.error( 'Failed to load users' );
      } finally {
         setIsLoading( false );
      }
   }, [searchQuery] );

   const fetchRoles = useCallback( async () => {
      try {
         const rolesData = await userService.getRoles();
         setRoles( rolesData );
      } catch ( error ) {
         console.error( 'Failed to fetch roles:', error );
      }
   }, [] );

   useEffect( () => {
      fetchUsers();
      fetchRoles();
   }, [fetchUsers, fetchRoles] );

   const handleEditUser = ( user: User ) => {
      setEditingUser( { ...user } );
      setIsEditModalOpen( true );
   };

   const handleSaveUser = async () => {
      if ( !editingUser ) return;
      try {
         setIsSaving( true );
         await userService.updateUser( editingUser.id, {
            firstName: editingUser.firstName,
            lastName: editingUser.lastName,
            email: editingUser.email,
            department: editingUser.department,
            jobTitle: editingUser.jobTitle,
            status: editingUser.status,
         } );
         toast.success( 'User updated successfully' );
         setIsEditModalOpen( false );
         setEditingUser( null );
         fetchUsers();
      } catch ( error ) {
         toast.error( 'Failed to update user' );
      } finally {
         setIsSaving( false );
      }
   };

   const handleCreateUser = async () => {
      if ( !newUser.email || !newUser.first_name || !newUser.last_name || !newUser.password ) {
         toast.error( 'Please fill in all required fields' );
         return;
      }
      try {
         setIsSaving( true );
         await userService.createUser( newUser );
         toast.success( 'User created successfully' );
         setIsCreateModalOpen( false );
         resetNewUserForm();
         fetchUsers();
      } catch ( error: any ) {
         toast.error( error.response?.data?.detail || 'Failed to create user' );
      } finally {
         setIsSaving( false );
      }
   };

   const resetNewUserForm = () => {
      setNewUser( { email: '', first_name: '', last_name: '', password: '', role: 'user', department: '', job_title: '', phone: '' } );
   };

   const handleDeleteUser = async ( userId: string ) => {
      if ( !confirm( 'Are you sure you want to delete this user?' ) ) return;
      try {
         await userService.deleteUser( userId );
         toast.success( 'User deleted successfully' );
         fetchUsers();
      } catch ( error ) {
         toast.error( 'Failed to delete user' );
      }
   };

   const handleSelectAll = () => {
      if ( selectedUsers.length === filteredUsers.length ) { setSelectedUsers( [] ); }
      else { setSelectedUsers( filteredUsers.map( u => u.id ) ); }
   };

   const filteredUsers = users.filter( ( user ) => {
      if ( statusFilter && user.status !== statusFilter ) return false;
      if ( roleFilter && !user.roles?.some( ( r ) => r.code === roleFilter ) ) return false;
      return true;
   } );

   const paginatedUsers = filteredUsers.slice( ( currentPage - 1 ) * itemsPerPage, currentPage * itemsPerPage );

   const stats = {
      total: users.length,
      active: users.filter( u => u.status === 'active' ).length,
      inactive: users.filter( u => u.status === 'inactive' ).length,
      pending: users.filter( u => u.status === 'pending' ).length,
   };

   const getInitials = ( user: User ): string => {
      const name = user.displayName || `${user.firstName} ${user.lastName}`;
      return name.split( ' ' ).map( n => n[0] ).join( '' ).toUpperCase().slice( 0, 2 );
   };

   const getRoleColor = ( role?: string ) => {
      const roleMap: Record<string, string> = {
         admin: 'from-purple-500 to-pink-500',
         manager: 'from-blue-500 to-cyan-500',
         agent: 'from-green-500 to-emerald-500',
         user: 'from-slate-500 to-slate-600',
      };
      return roleMap[role || 'user'] || roleMap.user;
   };

   return (
      <div className="space-y-8 min-h-screen -m-6 p-6" style={ {
         background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f8fafc 100%)'
      } }>
         {/* Animated Background Elements */ }
         <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={ { animationDelay: '1s' } } />
         </div>

         {/* Header Section */ }
         <motion.div
            initial={ { opacity: 0, y: -20 } }
            animate={ { opacity: 1, y: 0 } }
            className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
         >
            <div>
               <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  User Management
               </h1>
               <p className={ clsx( "text-sm font-medium", isDark ? "text-slate-400" : "text-slate-600" ) }>
                  Manage your team members, roles, and permissions
               </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
               <button
                  onClick={ () => setViewMode( viewMode === 'grid' ? 'table' : 'grid' ) }
                  className={ clsx(
                     "p-3 rounded-xl border backdrop-blur-xl transition-all",
                     isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                        : "bg-white/80 border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900"
                  ) }
                  title={ viewMode === 'grid' ? 'Switch to Table View' : 'Switch to Grid View' }
               >
                  { viewMode === 'grid' ? <List size={ 20 } /> : <Grid size={ 20 } /> }
               </button>
               <button
                  className={ clsx(
                     "p-3 rounded-xl border backdrop-blur-xl transition-all",
                     isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                        : "bg-white/80 border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900"
                  ) }
                  title="Export Users"
               >
                  <Download size={ 20 } />
               </button>
               <button
                  className={ clsx(
                     "p-3 rounded-xl border backdrop-blur-xl transition-all",
                     isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                        : "bg-white/80 border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900"
                  ) }
                  title="Import Users"
               >
                  <Upload size={ 20 } />
               </button>
               <button
                  onClick={ () => setIsCreateModalOpen( true ) }
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center gap-2"
               >
                  <UserPlus size={ 20 } />
                  Add User
               </button>
            </div>
         </motion.div>

         {/* Stats Cards */ }
         <motion.div
            initial={ { opacity: 0, y: 20 } }
            animate={ { opacity: 1, y: 0 } }
            transition={ { delay: 0.1 } }
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
         >
            <StatCard label="Total Users" value={ stats.total } variant="indigo" icon={ <Users size={ 24 } /> } isDark={ isDark } />
            <StatCard label="Active" value={ stats.active } variant="emerald" icon={ <CheckCircle size={ 24 } /> } isDark={ isDark } />
            <StatCard label="Inactive" value={ stats.inactive } variant="red" icon={ <XCircle size={ 24 } /> } isDark={ isDark } />
            <StatCard label="Pending" value={ stats.pending } variant="amber" icon={ <Clock size={ 24 } /> } isDark={ isDark } />
         </motion.div>

         {/* Bulk Actions Bar */ }
         <AnimatePresence>
            { selectedUsers.length > 0 && (
               <motion.div
                  initial={ { opacity: 0, scale: 0.95, y: 20 } }
                  animate={ { opacity: 1, scale: 1, y: 0 } }
                  exit={ { opacity: 0, scale: 0.95, y: 20 } }
                  className={ clsx(
                     "p-4 rounded-2xl border backdrop-blur-xl flex items-center justify-between relative z-10",
                     isDark
                        ? "bg-indigo-500/10 border-indigo-500/30"
                        : "bg-indigo-50 border-indigo-200"
                  ) }
               >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        { selectedUsers.length }
                     </div>
                     <div>
                        <span className={ clsx( "text-sm font-semibold", isDark ? "text-white" : "text-slate-900" ) }>
                           { selectedUsers.length } user{ selectedUsers.length > 1 ? 's' : '' } selected
                        </span>
                        <p className={ clsx( "text-xs", isDark ? "text-indigo-400" : "text-indigo-600" ) }>
                           Choose an action to apply
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button className={ clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        isDark
                           ? "bg-white/10 hover:bg-white/20 text-white"
                           : "bg-white hover:bg-slate-50 text-slate-900"
                     ) }>
                        Change Role
                     </button>
                     <button className={ clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        isDark
                           ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                           : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                     ) }>
                        Deactivate
                     </button>
                     <button onClick={ () => setSelectedUsers( [] ) } className={ clsx(
                        "w-10 h-10 flex items-center justify-center rounded-lg transition-all",
                        isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-600"
                     ) }>
                        <X size={ 18 } />
                     </button>
                  </div>
               </motion.div>
            ) }
         </AnimatePresence>

         {/* Filters & Search */ }
         <motion.div
            initial={ { opacity: 0, y: 20 } }
            animate={ { opacity: 1, y: 0 } }
            transition={ { delay: 0.2 } }
            className={ clsx(
               "p-6 rounded-2xl border backdrop-blur-xl relative z-10",
               isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-white/80 border-slate-200"
            ) }
         >
            <div className="flex flex-col lg:flex-row gap-4">
               <div className={ clsx(
                  "flex items-center px-4 py-3 rounded-xl border flex-1 transition-all",
                  isDark
                     ? "bg-white/5 border-white/10 focus-within:border-indigo-500/50"
                     : "bg-white border-slate-200 focus-within:border-indigo-400"
               ) }>
                  <Search size={ 20 } className={ isDark ? "text-slate-500" : "text-slate-400" } />
                  <input
                     type="text"
                     placeholder="Search users by name or email..."
                     value={ searchQuery }
                     onChange={ ( e ) => setSearchQuery( e.target.value ) }
                     className={ clsx(
                        "bg-transparent border-none focus:ring-0 text-sm w-full ml-3 placeholder:text-slate-500",
                        isDark ? "text-white" : "text-slate-900"
                     ) }
                  />
               </div>
               <select
                  className={ clsx(
                     "px-4 py-3 rounded-xl border text-sm font-medium focus:ring-0 transition-all",
                     isDark
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-slate-200 text-slate-900"
                  ) }
                  value={ roleFilter }
                  onChange={ ( e ) => setRoleFilter( e.target.value ) }
               >
                  <option value="">All Roles</option>
                  { roles.map( r => <option key={ r.code } value={ r.code }>{ r.name }</option> ) }
               </select>
               <select
                  className={ clsx(
                     "px-4 py-3 rounded-xl border text-sm font-medium focus:ring-0 transition-all",
                     isDark
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-slate-200 text-slate-900"
                  ) }
                  value={ statusFilter }
                  onChange={ ( e ) => setStatusFilter( e.target.value ) }
               >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
               </select>
               <button
                  onClick={ fetchUsers }
                  className={ clsx(
                     "px-4 py-3 rounded-xl border transition-all",
                     isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                  ) }
               >
                  <RefreshCw size={ 20 } className={ isLoading ? 'animate-spin' : '' } />
               </button>
            </div>
         </motion.div>

         {/* Users Grid/Table */ }
         <motion.div
            initial={ { opacity: 0, y: 20 } }
            animate={ { opacity: 1, y: 0 } }
            transition={ { delay: 0.3 } }
            className={ clsx(
               "rounded-2xl border backdrop-blur-xl overflow-hidden relative z-10",
               isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-white/80 border-slate-200"
            ) }
         >
            { viewMode === 'grid' ? (
               <div className="p-6">
                  { isLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        { [...Array( 8 )].map( ( _, i ) => (
                           <div key={ i } className={ clsx( "p-6 rounded-xl animate-pulse", isDark ? "bg-white/5" : "bg-slate-100" ) }>
                              <div className={ clsx( "w-16 h-16 rounded-full mb-4", isDark ? "bg-white/10" : "bg-slate-200" ) } />
                              <div className={ clsx( "h-4 rounded mb-2", isDark ? "bg-white/10" : "bg-slate-200" ) } />
                              <div className={ clsx( "h-3 rounded w-2/3", isDark ? "bg-white/10" : "bg-slate-200" ) } />
                           </div>
                        ) ) }
                     </div>
                  ) : paginatedUsers.length === 0 ? (
                     <div className="py-20 text-center">
                        <Users size={ 48 } className={ clsx( "mx-auto mb-4", isDark ? "text-slate-700" : "text-slate-300" ) } />
                        <p className={ clsx( "text-sm font-medium", isDark ? "text-slate-500" : "text-slate-600" ) }>No users found</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        { paginatedUsers.map( ( user, index ) => (
                           <motion.div
                              key={ user.id }
                              initial={ { opacity: 0, scale: 0.9 } }
                              animate={ { opacity: 1, scale: 1 } }
                              transition={ { delay: index * 0.05 } }
                              className={ clsx(
                                 "p-6 rounded-xl border group hover:shadow-xl transition-all cursor-pointer",
                                 isDark
                                    ? "bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-white/10"
                                    : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-indigo-100"
                              ) }
                           >
                              <div className="flex items-start justify-between mb-4">
                                 <div className={ clsx(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform bg-gradient-to-br",
                                    getRoleColor( user.roles?.[0]?.code )
                                 ) }>
                                    { getInitials( user ) }
                                 </div>
                                 <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-indigo-500 focus:ring-0"
                                    checked={ selectedUsers.includes( user.id ) }
                                    onChange={ () => setSelectedUsers( prev =>
                                       prev.includes( user.id ) ? prev.filter( id => id !== user.id ) : [...prev, user.id]
                                    ) }
                                 />
                              </div>
                              <Link to={ `/users/${user.id}` }>
                                 <h3 className={ clsx(
                                    "text-lg font-bold mb-1 group-hover:text-indigo-400 transition-colors",
                                    isDark ? "text-white" : "text-slate-900"
                                 ) }>
                                    { user.displayName || `${user.firstName} ${user.lastName}` }
                                 </h3>
                                 <p className={ clsx( "text-sm mb-3", isDark ? "text-slate-500" : "text-slate-600" ) }>
                                    { user.email }
                                 </p>
                                 <div className="flex items-center justify-between">
                                    <span className={ clsx(
                                       "px-3 py-1 rounded-lg text-xs font-semibold",
                                       isDark ? "bg-white/10 text-indigo-400" : "bg-indigo-100 text-indigo-700"
                                    ) }>
                                       { user.roles?.[0]?.name || 'User' }
                                    </span>
                                    <div className={ clsx(
                                       "flex items-center gap-1.5 text-xs font-medium",
                                       user.status === 'active' ? ( isDark ? 'text-emerald-400' : 'text-emerald-600' ) :
                                          user.status === 'pending' ? ( isDark ? 'text-amber-400' : 'text-amber-600' ) :
                                             ( isDark ? 'text-red-400' : 'text-red-600' )
                                    ) }>
                                       <div className={ clsx(
                                          "w-2 h-2 rounded-full",
                                          user.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                                             user.status === 'pending' ? 'bg-amber-400 animate-pulse' :
                                                'bg-red-400'
                                       ) } />
                                       { user.status }
                                    </div>
                                 </div>
                              </Link>
                              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                                 <button
                                    onClick={ () => handleEditUser( user ) }
                                    className={ clsx(
                                       "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                                       isDark
                                          ? "bg-white/5 hover:bg-white/10 text-white"
                                          : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                                    ) }
                                 >
                                    Edit
                                 </button>
                                 <button
                                    onClick={ () => handleDeleteUser( user.id ) }
                                    className={ clsx(
                                       "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                                       isDark
                                          ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                          : "bg-red-50 hover:bg-red-100 text-red-600"
                                    ) }
                                 >
                                    <Trash2 size={ 14 } />
                                 </button>
                              </div>
                           </motion.div>
                        ) ) }
                     </div>
                  ) }
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full">
                     <thead className={ isDark ? "bg-white/5" : "bg-slate-50" }>
                        <tr className={ clsx( "text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600" ) }>
                           <th className="px-6 py-4 text-left w-10">
                              <input
                                 type="checkbox"
                                 className="w-4 h-4 rounded-lg bg-white/5 border-white/10 text-indigo-500 focus:ring-0"
                                 checked={ selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 }
                                 onChange={ handleSelectAll }
                              />
                           </th>
                           <th className="px-6 py-4 text-left">User</th>
                           <th className="px-6 py-4 text-left">Role</th>
                           <th className="px-6 py-4 text-left">Department</th>
                           <th className="px-6 py-4 text-left">Status</th>
                           <th className="px-6 py-4 text-left">Last Login</th>
                           <th className="px-6 py-4"></th>
                        </tr>
                     </thead>
                     <tbody className={ clsx( "divide-y", isDark ? "divide-white/5" : "divide-slate-200" ) }>
                        { isLoading ? (
                           [...Array( 6 )].map( ( _, i ) => (
                              <tr key={ i }>
                                 <td colSpan={ 7 } className="px-6 py-6">
                                    <div className={ clsx( "h-4 rounded-full animate-pulse", isDark ? "bg-white/5" : "bg-slate-200" ) } />
                                 </td>
                              </tr>
                           ) )
                        ) : paginatedUsers.length === 0 ? (
                           <tr>
                              <td colSpan={ 7 } className="px-6 py-20 text-center">
                                 <Users size={ 48 } className={ clsx( "mx-auto mb-4", isDark ? "text-slate-700" : "text-slate-300" ) } />
                                 <p className={ clsx( "text-sm font-medium", isDark ? "text-slate-500" : "text-slate-600" ) }>No users found</p>
                              </td>
                           </tr>
                        ) : (
                           paginatedUsers.map( ( user ) => (
                              <tr key={ user.id } className={ clsx( "group transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50" ) }>
                                 <td className="px-6 py-5">
                                    <input
                                       type="checkbox"
                                       className="w-4 h-4 rounded-lg bg-white/5 border-white/10 text-indigo-500 focus:ring-0"
                                       checked={ selectedUsers.includes( user.id ) }
                                       onChange={ () => setSelectedUsers( prev =>
                                          prev.includes( user.id ) ? prev.filter( id => id !== user.id ) : [...prev, user.id]
                                       ) }
                                    />
                                 </td>
                                 <td className="px-6 py-5">
                                    <Link to={ `/users/${user.id}` } className="flex items-center gap-4">
                                       <div className={ clsx(
                                          "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform bg-gradient-to-br",
                                          getRoleColor( user.roles?.[0]?.code )
                                       ) }>
                                          { getInitials( user ) }
                                       </div>
                                       <div>
                                          <div className={ clsx(
                                             "text-sm font-semibold group-hover:text-indigo-400 transition-colors",
                                             isDark ? "text-white" : "text-slate-900"
                                          ) }>
                                             { user.displayName || `${user.firstName} ${user.lastName}` }
                                          </div>
                                          <div className={ clsx( "text-xs", isDark ? "text-slate-500" : "text-slate-600" ) }>
                                             { user.email }
                                          </div>
                                       </div>
                                    </Link>
                                 </td>
                                 <td className="px-6 py-5">
                                    <span className={ clsx(
                                       "px-3 py-1 rounded-lg text-xs font-semibold",
                                       isDark ? "bg-white/10 text-indigo-400" : "bg-indigo-100 text-indigo-700"
                                    ) }>
                                       { user.roles?.[0]?.name || 'User' }
                                    </span>
                                 </td>
                                 <td className="px-6 py-5">
                                    <div className={ clsx( "text-sm", isDark ? "text-slate-400" : "text-slate-600" ) }>
                                       { user.department || '—' }
                                    </div>
                                 </td>
                                 <td className="px-6 py-5">
                                    <div className={ clsx(
                                       "flex items-center gap-2 text-xs font-medium",
                                       user.status === 'active' ? ( isDark ? 'text-emerald-400' : 'text-emerald-600' ) :
                                          user.status === 'pending' ? ( isDark ? 'text-amber-400' : 'text-amber-600' ) :
                                             ( isDark ? 'text-red-400' : 'text-red-600' )
                                    ) }>
                                       <div className={ clsx(
                                          "w-2 h-2 rounded-full",
                                          user.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                                             user.status === 'pending' ? 'bg-amber-400 animate-pulse' :
                                                'bg-red-400'
                                       ) } />
                                       { user.status }
                                    </div>
                                 </td>
                                 <td className="px-6 py-5">
                                    <div className={ clsx( "text-xs font-medium flex items-center gap-2", isDark ? "text-slate-500" : "text-slate-600" ) }>
                                       <Activity size={ 14 } className={ isDark ? "text-slate-700" : "text-slate-400" } />
                                       { user.lastLogin ? format( new Date( user.lastLogin ), 'MMM d, HH:mm' ) : 'Never' }
                                    </div>
                                 </td>
                                 <td className="px-6 py-5 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button
                                          onClick={ () => handleEditUser( user ) }
                                          className={ clsx(
                                             "p-2 rounded-lg transition-all",
                                             isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                          ) }
                                       >
                                          <Edit size={ 16 } />
                                       </button>
                                       <button
                                          onClick={ () => handleDeleteUser( user.id ) }
                                          className={ clsx(
                                             "p-2 rounded-lg transition-all",
                                             isDark ? "hover:bg-red-500/10 text-slate-400 hover:text-red-400" : "hover:bg-red-50 text-slate-600 hover:text-red-600"
                                          ) }
                                       >
                                          <Trash2 size={ 16 } />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ) )
                        ) }
                     </tbody>
                  </table>
               </div>
            ) }

            {/* Pagination */ }
            <div className={ clsx(
               "px-6 py-4 border-t flex justify-between items-center",
               isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
            ) }>
               <div className={ clsx( "text-sm font-medium", isDark ? "text-slate-400" : "text-slate-600" ) }>
                  Showing { ( ( currentPage - 1 ) * itemsPerPage ) + 1 } - { Math.min( currentPage * itemsPerPage, filteredUsers.length ) } of { filteredUsers.length }
               </div>
               <div className="flex gap-2">
                  <button
                     onClick={ () => setCurrentPage( prev => Math.max( 1, prev - 1 ) ) }
                     disabled={ currentPage === 1 }
                     className={ clsx(
                        "px-4 py-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                        isDark
                           ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                           : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
                     ) }
                  >
                     <ChevronLeft size={ 18 } />
                  </button>
                  <button
                     onClick={ () => setCurrentPage( prev => prev + 1 ) }
                     disabled={ currentPage * itemsPerPage >= filteredUsers.length }
                     className={ clsx(
                        "px-4 py-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                        isDark
                           ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                           : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
                     ) }
                  >
                     <ChevronRight size={ 18 } />
                  </button>
               </div>
            </div>
         </motion.div>

         {/* Create User Modal */ }
         <Modal isOpen={ isCreateModalOpen } onClose={ () => { setIsCreateModalOpen( false ); resetNewUserForm(); } } title="Create New User" size="md">
            <div className="space-y-4 pt-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>First Name</label>
                     <input
                        type="text"
                        className={ clsx(
                           "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                           isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        ) }
                        value={ newUser.first_name }
                        onChange={ e => setNewUser( { ...newUser, first_name: e.target.value } ) }
                     />
                  </div>
                  <div>
                     <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Last Name</label>
                     <input
                        type="text"
                        className={ clsx(
                           "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                           isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        ) }
                        value={ newUser.last_name }
                        onChange={ e => setNewUser( { ...newUser, last_name: e.target.value } ) }
                     />
                  </div>
               </div>
               <div>
                  <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Email Address</label>
                  <input
                     type="email"
                     className={ clsx(
                        "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                        isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                     ) }
                     value={ newUser.email }
                     onChange={ e => setNewUser( { ...newUser, email: e.target.value } ) }
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Role</label>
                     <select
                        className={ clsx(
                           "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                           isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        ) }
                        value={ newUser.role }
                        onChange={ e => setNewUser( { ...newUser, role: e.target.value } ) }
                     >
                        <option value="user">User</option>
                        <option value="agent">Agent</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                     </select>
                  </div>
                  <div>
                     <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Department</label>
                     <input
                        type="text"
                        className={ clsx(
                           "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                           isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        ) }
                        value={ newUser.department }
                        onChange={ e => setNewUser( { ...newUser, department: e.target.value } ) }
                     />
                  </div>
               </div>
               <div>
                  <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Password</label>
                  <input
                     type="password"
                     className={ clsx(
                        "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                        isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                     ) }
                     value={ newUser.password }
                     onChange={ e => setNewUser( { ...newUser, password: e.target.value } ) }
                  />
               </div>
               <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button variant="outline" onClick={ () => setIsCreateModalOpen( false ) } className="rounded-xl">
                     Cancel
                  </Button>
                  <Button onClick={ handleCreateUser } isLoading={ isSaving } className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                     Create User
                  </Button>
               </div>
            </div>
         </Modal>

         {/* Edit User Modal */ }
         <Modal isOpen={ isEditModalOpen } onClose={ () => setIsEditModalOpen( false ) } title="Edit User" size="md">
            { editingUser && (
               <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>First Name</label>
                        <input
                           type="text"
                           className={ clsx(
                              "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                              isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                           ) }
                           value={ editingUser.firstName }
                           onChange={ e => setEditingUser( { ...editingUser, firstName: e.target.value } ) }
                        />
                     </div>
                     <div>
                        <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Last Name</label>
                        <input
                           type="text"
                           className={ clsx(
                              "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                              isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                           ) }
                           value={ editingUser.lastName }
                           onChange={ e => setEditingUser( { ...editingUser, lastName: e.target.value } ) }
                        />
                     </div>
                  </div>
                  <div>
                     <label className={ clsx( "text-xs font-semibold mb-2 block", isDark ? "text-slate-400" : "text-slate-600" ) }>Status</label>
                     <select
                        className={ clsx(
                           "w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500",
                           isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        ) }
                        value={ editingUser.status }
                        onChange={ e => setEditingUser( { ...editingUser, status: e.target.value as any } ) }
                     >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                     </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                     <Button variant="outline" onClick={ () => setIsEditModalOpen( false ) } className="rounded-xl">
                        Cancel
                     </Button>
                     <Button onClick={ handleSaveUser } isLoading={ isSaving } className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                        Save Changes
                     </Button>
                  </div>
               </div>
            ) }
         </Modal>
      </div>
   );
};

const StatCard = ( { label, value, variant, icon, isDark }: any ) => {
   const gradients: Record<string, string> = {
      indigo: 'from-indigo-500 to-purple-600',
      emerald: 'from-emerald-500 to-teal-600',
      red: 'from-red-500 to-pink-600',
      amber: 'from-amber-500 to-orange-600',
   };

   return (
      <motion.div
         initial={ { opacity: 0, scale: 0.9 } }
         animate={ { opacity: 1, scale: 1 } }
         whileHover={ { scale: 1.02 } }
         className={ clsx(
            "p-6 rounded-2xl border backdrop-blur-xl group relative overflow-hidden",
            isDark
               ? "bg-white/5 border-white/10 hover:border-white/20"
               : "bg-white/80 border-slate-200 hover:border-slate-300"
         ) }
      >
         <div className="relative z-10 flex items-center justify-between">
            <div>
               <h2 className={ clsx( "text-4xl font-bold mb-2", isDark ? "text-white" : "text-slate-900" ) }>
                  { value }
               </h2>
               <p className={ clsx( "text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-600" ) }>
                  { label }
               </p>
            </div>
            <div className={ clsx(
               "w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br",
               gradients[variant]
            ) }>
               { icon }
            </div>
         </div>
         <div className={ clsx(
            "absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br",
            gradients[variant]
         ) } />
      </motion.div>
   );
};

export default UsersPage;
