import { Router } from 'express'
import { listFavorites, addFavorite, deleteFavorite } from '../controllers/favorites.controller'
const router = Router()
router.get('/',     listFavorites)
router.post('/',    addFavorite)
router.delete('/:id', deleteFavorite)
export default router
