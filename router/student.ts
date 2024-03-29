import { UserType } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import prisma from "../prisma";

const routes = async (app: FastifyInstance) => {
    app.addHook(
        "onRequest",
        async (request: FastifyRequest, reply: FastifyReply) => {
            if (!request.user || request.user.type !== UserType.STUDENT) {
                return reply.code(401).send({
                    error: "Unauthorized",
                });
            }
        }
    );

    app.get("/api/get/student-notices/:id/:page", async (request, reply) => {
        const { id, page } = request.params as { id: string; page: string };

        if (!id) {
            return reply.code(400).send({
                error: "Bad Request",
            });
        }

        const pagen = page ? Number(page) : 0;

        if (isNaN(pagen)) {
            return reply.status(400);
        }

        const student = request.user.students.filter(
            (student) => student.id === id
        );

        if (student.length === 0) {
            return reply.code(401).send({
                error: "Unauthorized",
            });
        }

        const students_class = await prisma.student.findFirst({
            where: {
                id,
            },
            select: {
                class: true,
            },
        });

        const notices = await prisma.notice.findMany({
            where: {
                class: {
                    id: students_class?.class.id,
                },
            },
            take: 10,
            skip: pagen * 10,
            orderBy: {
                createdAt: "desc",
            },
        });

        const count = await prisma.notice.count({
            where: {
                class: {
                    id: students_class?.class.id,
                },
            },
        });

        const page_count = count / 10 + (count % 10 ? 1 : 0);

        reply.status(200).send({
            success: true,
            notices,
            page_count,
        });
    });

    app.get("/api/get/student-attendance/:id/:date", async (request, reply) => {
        const { id, date } = request.params as { id: string, date: string };

        if (!id || !date) {
            return reply.code(400).send({
                error: "Bad Request",
            });
        }

        const ddate = new Date(date);

        if (isNaN(ddate.getTime())) {
            return reply.code(400).send({
                error: "Bad Request",
            });
        }

        const student = request.user.students.filter(
            (student) => student.id === id
        );

        if (student.length === 0) {
            return reply.code(401).send({
                error: "Unauthorized",
            });
        }

        const attendance = await prisma.attendance.findMany({
            where: {
                studentId: id,
                date: {
                    gte: new Date(ddate.getFullYear(), ddate.getMonth(), ddate.getDate()),
                    lt: new Date(ddate.getFullYear(), ddate.getMonth(), ddate.getDate() + 1),
                }
            },
            select: {
                date: true,
                present: true,
            },
            orderBy: {
                date: "desc",
            },
        });

        reply.status(200).send({
            success: true,
            attendance,
        });
    });
};

export default routes;
