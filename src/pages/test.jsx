<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {jobsLoading ? (
                                <div className="p-10 text-center text-gray-500">Loading jobs...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                                            <tr>
                                                <th className="p-4 font-semibold">Job Role</th>
                                                <th className="p-4 font-semibold">Company</th>
                                                <th className="p-4 font-semibold">Posted</th>
                                                <th className="p-4 font-semibold">Status</th>
                                                <th className="p-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {jobs.map((job) => (
                                                <tr key={job.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-800">{job.title}</div>
                                                    </td>
                                                    <td className="p-4 text-gray-600">
                                                        {job.company}
                                                    </td>
                                                    <td className="p-4 text-gray-500 text-sm">
                                                        {new Date(job.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => toggleJobStatus(job.id, job.is_active)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${job.is_active
                                                                ? "bg-green-100 text-green-700 border-green-200"
                                                                : "bg-gray-100 text-gray-500 border-gray-200"
                                                                }`}
                                                        >
                                                            {job.is_active ? "Active" : "Disabled"}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => toggleJobStatus(job.id, job.is_active)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                                                            title={job.is_active ? "Hide Job" : "Show Job"}
                                                        >
                                                            {job.is_active ? '👁️' : '🚫'}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteJob(job.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                                            title="Delete Job"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {jobs.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="p-10 text-center text-gray-400">
                                                        No jobs found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>