import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiohttp import web

# --- НАСТРОЙКИ ---
TOKEN = "8823415495:AAEhWg3MTlZBhsRWlfI4x2yjxqdS-TTM56M"
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = 8080
# Вставь сюда свою HTTPS-ссылку (от ngrok или хостинга)
WEB_APP_URL = "https://твой-домен.com/" 

dp = Dispatcher()

# Отдаем index.html при открытии корня сайта
async def handle_index(request):
    return web.FileResponse('./web/index.html')

async def web_server_runner():
    app = web.Application()
    app.router.add_get('/', handle_index)
    app.router.add_static('/', path='./web', name='static')
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, WEB_SERVER_HOST, WEB_SERVER_PORT)
    await site.start()
    logging.info(f"Веб-сервер запущен на http://{WEB_SERVER_HOST}:{WEB_SERVER_PORT}")

@dp.message(CommandStart())
async def cmd_start(message: Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎮 Запустить игру: На одной из...", 
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ]
        ]
    )
    
    await message.answer(
        "Привет. История Ноа, Лины и Ника ждет тебя.\n\n"
        "Нажми кнопку ниже, чтобы открыть новеллу:",
        reply_markup=keyboard
    )

async def main():
    logging.basicConfig(level=logging.INFO)
    
    # Запускаем веб-сервер в фоне
    await web_server_runner()
    
    bot = Bot(token=TOKEN)
    # Удаляем старые вебхуки, если были, и запускаем бота
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())