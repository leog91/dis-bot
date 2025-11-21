import { TextChannel } from "discord.js";
import { defineCommand } from "..";

export default defineCommand({
    name: "alber",
    type: "TEXT",
    description: "random alberto image",
    async execute(msg) {

        if (
            msg.channel instanceof TextChannel ||

            msg.channel.isThread()
        ) {

            await msg.channel.send(`han pasado ${Math.floor(Math.random() * 100)} días desde el ultimo bife`);
            const alberImg = [
                "https://media.tiempodesanjuan.com/p/48241a6e591cec56477be174421c777c/adjuntos/331/imagenes/000/762/0000762150/790x0/smart/albertojpg.jpg",
                "https://pbs.twimg.com/media/GUf-N3QXcAAfXJQ.jpg",
                "https://www.clarin.com/img/2022/06/21/tLnSIH08I_720x0__1.jpg",
                "https://media.lmcipolletti.com/p/be340a12bcd48535d5779ca8eb55d651/adjuntos/195/imagenes/007/483/0007483103/albertojpg.jpg",
                "https://www.argentina.gob.ar/sites/default/files/alberto_fernandez_presidente_argentino_brinda_datos_con_graficos_sobre_coronavirus_0.jpg",
            ];
            await msg.channel.send({ files: [alberImg[Math.floor(Math.random() * alberImg.length)]] });
        } else {
            await msg.reply("Cannot send images in this channel type.");
        }
    }
});