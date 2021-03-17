/*
 * @Author: your name
 * @Date: 2020-12-28 15:06:57
 * @LastEditTime: 2021-02-22 10:21:26
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \test-axios-api-start\src\routes\loginRouter.js
 */
import Router from 'koa-router'
import loginController from '../../api/LoginController'

const router = new Router()

router.prefix('/login')
router.post('/forget', loginController.forget)
router.post('/login', loginController.login)
router.post('/reg', loginController.reg)

export default router
